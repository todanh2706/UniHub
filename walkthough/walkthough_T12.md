# T12 Walkthrough - Rate Limiting, Circuit Breaker & Idempotency

## Muc tieu T12

- Dua cac thiet ke o T04 (Co che bao ve he thong) vao code thuc te.
- Chan request bang Token Bucket tren Redis de bao ve API.
- Implement Circuit Breaker cho payment gateway voi Resilience4j.
- Implement Idempotency Key cho API dang ky/thanh toan de an toan khi client retry.

## Nhung gi da hoan thanh

### 1) Rate Limiting (Token Bucket + Redis)

**Cac file da them:**
- `src/backend/src/main/java/vn/unihub/backend/config/RateLimitProperties.java`
- `src/backend/src/main/java/vn/unihub/backend/ratelimit/RateLimiterService.java`
- `src/backend/src/main/java/vn/unihub/backend/ratelimit/RateLimitFilter.java`
- `src/backend/src/main/java/vn/unihub/backend/repository/RateLimitPolicyRepository.java`
- `src/backend/src/main/java/vn/unihub/backend/exception/RateLimitedException.java`

**Kien truc:**
- `RateLimitFilter` la `OncePerRequestFilter` chay sau JWT authentication.
- Token Bucket duoc thuc thi bang Redis Lua script dam bao atomic.
- Khi Redis loi, dung local in-memory fallback (Bucket4j in-memory).
- Policy duoc cau hinh tu 2 nguon (hybrid):
  - `application.yaml` (mac dinh, don gian).
  - `rate_limit_policies` table trong PostgreSQL (dynamic, override).

**Chinh sach mac dinh (`application.yaml`):**

| Scope | Endpoint | Limit | Window | Muc tieu |
|-------|----------|-------|--------|----------|
| IP | `POST:/api/v1/registrations` | 90 | 60s | Chan bot/NAT bat thuong |
| IP | `POST:/api/v1/auth/login` | 20 | 60s | Giam brute force |
| IP | `GET:/api/v1/workshops` | 300 | 60s | Bao ve API doc |
| USER | `POST:/api/v1/payments` | 3 | 10s | Tranh spam thanh toan |

**Chinh sach DB demo (seed data):**

| Scope | Endpoint | Role | Limit | Window |
|-------|----------|------|-------|--------|
| USER | `/api/v1/registrations` | STUDENT | 5 | 3s |
| IP | `/api/v1/registrations` | — | 90 | 60s |
| USER | `/api/v1/payments` | — | 3 | 10s |

**Response khi bi gioi han (429):**
```json
{
  "error": "RATE_LIMITED",
  "message": "Ban dang gui yeu cau qua nhanh. Vui long thu lai sau vai giay.",
  "retryAfterSeconds": 3
}
```
Headers: `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

**Fail-open strategy:**
- GET endpoints (workshops) van hoat dong khi Redis loi.
- POST endpoints dung local fallback voi gioi han bao thu hon.

### 2) Circuit Breaker (Resilience4j)

**Cac file da them:**
- `src/backend/src/main/java/vn/unihub/backend/circuitbreaker/CircuitBreakerService.java`
- `src/backend/src/main/java/vn/unihub/backend/payment/MockPaymentGateway.java`
- `src/backend/src/main/java/vn/unihub/backend/payment/PaymentService.java`
- `src/backend/src/main/java/vn/unihub/backend/repository/CircuitBreakerEventRepository.java`
- `src/backend/src/main/java/vn/unihub/backend/exception/PaymentUnavailableException.java`

**State machine:**
```
CLOSED ──(5 loi lien tiep)──→ OPEN
OPEN   ──(sau 30s)──────────→ HALF_OPEN
HALF_OPEN ──(success)───────→ CLOSED
HALF_OPEN ──(failure)───────→ OPEN
```

**Cau hinh Resilience4j:**
- `failureRateThreshold: 50%`
- `slidingWindowSize: 5` (COUNT_BASED)
- `waitDurationInOpenState: 30s`
- `permittedNumberOfCallsInHalfOpenState: 1`
- Timeout, connection refused, RuntimeException deu tinh la failure.
- `IllegalArgumentException` khong tinh la failure (loi nghiep vu).

**Audit log:**
- Moi lan circuit chuyen trang thai, `CircuitBreakerEvent` duoc ghi vao PostgreSQL.
- Truong `service_name`, `from_state`, `to_state`, `reason`, `failure_count`.

**MockPaymentGateway (demo):**
- 60% xac suat fail (timeout hoac internal error).
- Sau 5 failure lien tiep, luon fail de demo circuit breaker.
- Co method `forceSuccess()` de test HALF_OPEN recovery.

**Graceful degradation khi circuit OPEN:**
- Workshop mien phi → van dang ky binh thuong.
- Workshop co phi → API tra `503 PAYMENT_UNAVAILABLE`, KHONG giu cho.
- Sinh vien van xem duoc danh sach workshop.

**Response khi payment unavailable (503):**
```json
{
  "error": "PAYMENT_UNAVAILABLE",
  "message": "Cong thanh toan dang tam thoi gian doan. Vui long thu lai sau it phut.",
  "retryAfterSeconds": 30
}
```

### 3) Idempotency Key

**Cac file da them:**
- `src/backend/src/main/java/vn/unihub/backend/idempotency/IdempotencyFilter.java`
- `src/backend/src/main/java/vn/unihub/backend/idempotency/IdempotencyService.java`
- `src/backend/src/main/java/vn/unihub/backend/repository/IdempotencyKeyRepository.java`
- `src/backend/src/main/java/vn/unihub/backend/exception/IdempotencyConflictException.java`

**Cach su dung:**
Client gui UUID v4 qua header:
```http
Idempotency-Key: 6f4f23b7-9b24-4a3b-a93d-1c3c2f9792b7
```

**Luong xu ly:**
1. `IdempotencyFilter` check Redis cache truoc:
   - Co cached response → Replay ngay (khong can auth).
   - `IN_PROGRESS` → 409.
2. `RegistrationService` reserve key trong PostgreSQL + Redis.
3. Sau khi business logic hoan tat, response duoc luu vao cache.
4. TTL mac dinh: 1 gio.

**Cac tinh huong replay:**

| Tinh huong | Response |
|------------|----------|
| Key moi | Reserve `IN_PROGRESS`, xu ly request |
| Key cu, cung body, da `COMPLETED` | Tra lai response cu |
| Key cu, khac body | `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST` |
| Key cu dang `IN_PROGRESS` | `409 REQUEST_IN_PROGRESS` |

**Response khi conflict (409):**
```json
{
  "error": "REQUEST_IN_PROGRESS",
  "message": "Yeu cau truoc do voi Idempotency-Key nay van dang duoc xu ly."
}
```

```json
{
  "error": "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST",
  "message": "Idempotency-Key nay da duoc dung cho mot request khac."
}
```

**Luong tong the (filter order trong SecurityConfig):**
```
IdempotencyFilter → JwtAuthFilter → RateLimitFilter → Controller
```

### 4) Tich hop Payment cho workshop co phi

**Cap nhat `RegistrationService`:**
- Bo exception "Paid workshops are not supported".
- Workshop co phi → tao registration `PENDING_PAYMENT` (giu cho 15 phut).
- Goi `PaymentService` qua circuit breaker.
- Payment success → chuyen `CONFIRMED`.
- Payment fail/timeout → giu `PENDING_PAYMENT` den TTL.
- Circuit OPEN → tra `503`, khong giu cho.

### 5) Tich hop Frontend

**Cap nhat `src/frontend/src/api/axios.ts`:**
- `Idempotency-Key` tu dong duoc sinh cho moi POST/PUT/PATCH/DELETE request.
- Xu ly 429: hien thi thong bao + Retry-After.
- Xu ly 503: hien thi thong bao + Retry-After.
- Xu ly 409 `IDEMPOTENCY_KEY_REUSED`: tu dong retry voi key moi.

**Them component `ApiErrorNotice.tsx`:**
- Hien thi loi than thien cho 429, 503, 409.
- Nut "Thu lai" cho nguoi dung.
- Hien thi thoi gian cho.

### 6) Cap nhat cau hinh va du lieu mau

**`application.yaml`:**
- Them 4 rate-limit policies mac dinh.

**`V2__seed_demo_data.sql`:**
- Cap nhat `rate_limit_policies` voi 3 policies demo.
- Giua nguyen cac du lieu mau khac.

**`GlobalExceptionHandler.java`:**
- Them 4 exception handlers:
  - `RateLimitedException` → 429
  - `PaymentUnavailableException` → 503
  - `IdempotencyConflictException` → 409
  - `PaymentGatewayUnavailableException` → 503

### Thu tu middleware

```
Client request
    ↓
IdempotencyFilter  (replay cached response, conflict check)
    ↓
JwtAuthFilter      (authenticate)
    ↓
RateLimitFilter    (token bucket check)
    ↓
Controller
    ↓
Service (idempotency reserve → transaction → payment via circuit breaker)
```

## Cach chay test

### Test Rate Limiting
```bash
# Lay token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student1@unihub.local","password":"secret"}' | jq -r '.token')

# Gui 6 request lien tiep (policy per-user: 5 requests/3s)
for i in {1..6}; do
  curl -s -X POST http://localhost:8080/api/v1/registrations \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"workshopId":"34000000-0000-0000-0000-000000000001"}' \
    -w "\nHTTP %{http_code}\n"
done
# Request 6 → 429 Too Many Requests
```

### Test Idempotency
```bash
KEY="test-idempotency-$(uuidgen)"

# Request 1
curl -s -X POST http://localhost:8080/api/v1/registrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"workshopId":"34000000-0000-0000-0000-000000000001"}' | jq .

# Request 2 (cung key) → tra lai response y het
curl -s -X POST http://localhost:8080/api/v1/registrations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"workshopId":"34000000-0000-0000-0000-000000000001"}' | jq .
```

### Test Circuit Breaker
```bash
# Dang ky workshop co phi (3400...0002 co gia 50000 VND)
# Mock gateway co 60% fail rate → circuit se mo sau vai lan thu
for i in {1..8}; do
  echo "=== Request $i ==="
  curl -s -X POST http://localhost:8080/api/v1/registrations \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: cb-test-$(uuidgen)" \
    -d '{"workshopId":"34000000-0000-0000-0000-000000000002"}' \
    -w "\nHTTP %{http_code}\n" | jq .
done
# Sau khi circuit OPEN → 503 PAYMENT_UNAVAILABLE
```

## Ghi chu

- Backend can JDK de compile. Chay `docker compose -f src/docker-compose.yml up --build -d` de build.
- Redis duoc dung cho rate limiter state va idempotency cache.
- Resilience4j circuit breaker state la in-memory (per-instance). Audit log luu trong PostgreSQL.
- Bucket4j duoc dung cho local fallback khi Redis loi.
- Frontend tu dong sinh `Idempotency-Key` cho moi mutation request.
- Chi tiet API xem tai `walkthough/API.md`.
