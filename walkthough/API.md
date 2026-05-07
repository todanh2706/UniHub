# UniHub API Documentation

Base path: `/api/v1`

Authentication: Bearer JWT token. Public endpoints: `/auth/**`, `/actuator/**`. All other endpoints require authenticated user.

---

## Authentication

### Login

- Method: `POST`
- Path: `/auth/login`
- Auth: public
- Rate limit: 20 requests/phut/IP
- Request:
```json
{
  "email": "student1@unihub.local",
  "password": "secret"
}
```
- Response: `200 OK`
```json
{
  "token": "eyJhbG...",
  "refreshToken": "abc...",
  "user": { "id": "...", "email": "...", "fullName": "...", "roles": [...] }
}
```

### Register

- Method: `POST`
- Path: `/auth/register`
- Auth: public
- Response: `200 OK` (same shape as login)

### Refresh Token

- Method: `POST`
- Path: `/auth/refresh`
- Auth: public
- Request: `{ "refreshToken": "..." }`

### Logout

- Method: `POST`
- Path: `/auth/logout`
- Auth: public
- Request: `{ "refreshToken": "..." }`

---

## Rate Limiting (T12)

### Overview

All endpoints are protected by Token Bucket rate limiting backed by Redis (with local fallback).

### Rate Limit Headers (on every response)

| Header | Meaning |
|--------|---------|
| `X-RateLimit-Limit` | Max requests in window |
| `X-RateLimit-Remaining` | Remaining tokens |
| `X-RateLimit-Reset` | Unix timestamp when bucket resets |

### Default Policies

| Scope | Endpoint | Limit | Window |
|-------|----------|-------|--------|
| IP | `POST:/api/v1/auth/login` | 20 | 60s |
| IP | `GET:/api/v1/workshops` | 300 | 60s |
| IP | `POST:/api/v1/registrations` | 90 | 60s |
| USER | `POST:/api/v1/registrations` | 5 | 3s |
| USER | `POST:/api/v1/payments` | 3 | 10s |

DB table `rate_limit_policies` can override/extend these.

### 429 Too Many Requests

```json
{
  "error": "RATE_LIMITED",
  "message": "Ban dang gui yeu cau qua nhanh. Vui long thu lai sau vai giay.",
  "retryAfterSeconds": 3
}
```

Response headers: `Retry-After: 3`

---

## Idempotency Key (T12)

### Overview

All POST/PUT/PATCH/DELETE requests support idempotency via `Idempotency-Key` header.

### Usage

Client generates a UUID v4 and sends it in the header:
```http
Idempotency-Key: 6f4f23b7-9b24-4a3b-a93d-1c3c2f9792b7
```

- Retry with same key + same body → server replays the original response.
- Retry with same key + different body → `409` conflict.
- Requests before completion → `409 REQUEST_IN_PROGRESS`.

### 409 Idempotency Conflict

**Request still in progress:**
```json
{
  "error": "REQUEST_IN_PROGRESS",
  "message": "Yeu cau truoc do voi Idempotency-Key nay van dang duoc xu ly. Vui long thu lai sau."
}
```

**Same key, different request body:**
```json
{
  "error": "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST",
  "message": "Idempotency-Key nay da duoc dung cho mot request khac."
}
```

---

## Student Endpoints

### 1) List published workshops

- Method: `GET`
- Path: `/workshops`
- Auth: authenticated user
- Rate limit: 300 requests/phut/IP
- Response: `200 OK`
- Returns all `PUBLISHED` workshops with registration metadata.

### 2) Get workshop detail

- Method: `GET`
- Path: `/workshops/{workshopId}`
- Auth: authenticated user
- Response: `200 OK`, `404 Not Found`

### 3) Create registration

- Method: `POST`
- Path: `/registrations`
- Auth: `ROLE_STUDENT`
- Rate limit: 5 requests/3s per-user + 90 requests/phut/IP
- **Idempotency supported**: send `Idempotency-Key` header
- Request body:
```json
{
  "workshopId": "34000000-0000-0000-0000-000000000001"
}
```
- Response: `201 Created`
```json
{
  "id": "...",
  "workshopId": "...",
  "workshopTitle": "CV chuan doanh nghiep",
  "status": "CONFIRMED",
  "qrToken": "qr_...",
  "qrPayload": "/api/v1/checkins/qr/qr_...",
  "createdAt": "...",
  "confirmedAt": "...",
  "workshopStartTime": "...",
  "workshopEndTime": "..."
}
```

**Error cases:**

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Workshop not PUBLISHED, window closed, missing workshopId |
| 404 | Not Found | Workshop not found |
| 409 | Conflict | Full workshop, duplicate active registration, time overlap |
| 409 | REQUEST_IN_PROGRESS | Previous idempotent request still processing |
| 409 | IDEMPOTENCY_KEY_REUSED | Same key used with different request |
| 429 | RATE_LIMITED | Rate limit exceeded |
| 503 | PAYMENT_UNAVAILABLE | Payment gateway unavailable (paid workshops only) |

**Business behavior:**

- **Free workshop** (price = 0): creates `CONFIRMED` registration immediately.
- **Paid workshop** (price > 0): creates `PENDING_PAYMENT` registration (15-min hold), then initiates payment through circuit breaker.
  - Payment success → `CONFIRMED`.
  - Payment timeout/failure → stays `PENDING_PAYMENT` until TTL expires.
  - Circuit breaker OPEN → returns `503 PAYMENT_UNAVAILABLE`, does NOT hold seat.

### 4) List my registrations

- Method: `GET`
- Path: `/registrations/me`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`

### 5) Get my registration detail

- Method: `GET`
- Path: `/registrations/{registrationId}`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`, `404 Not Found`

### 6) Cancel my registration

- Method: `DELETE`
- Path: `/registrations/{registrationId}`
- Auth: `ROLE_STUDENT`
- Response: `200 OK`
- Error: `400` if not active or workshop already started, `404` not found

---

## Circuit Breaker (T12)

### Overview

Payment gateway is protected by Resilience4j circuit breaker.

**State machine:**
```
CLOSED ──(5 consecutive failures)──→ OPEN
OPEN   ──(after 30s)───────────────→ HALF_OPEN
HALF_OPEN ──(success)──────────────→ CLOSED
HALF_OPEN ──(failure)──────────────→ OPEN
```

**Failures counted:** timeout, HTTP 5xx, connection refused, RuntimeException.
**Not counted as failure:** IllegalArgumentException (business validation).

### 503 Payment Unavailable

When circuit is OPEN or payment gateway fails:
```json
{
  "error": "PAYMENT_UNAVAILABLE",
  "message": "Cong thanh toan dang tam thoi gian doan. Vui long thu lai sau it phut.",
  "retryAfterSeconds": 30
}
```

Response headers: `Retry-After: 30`

### Graceful degradation

| Scenario | Free workshops | Paid workshops |
|----------|---------------|----------------|
| Circuit CLOSED | Register normally | Register + payment |
| Circuit OPEN | Register normally | `503` — do NOT hold seat |
| Payment timeout | N/A | `PENDING_PAYMENT` 15-min TTL |

---

## Organizer Endpoints

### 7) List registrations by workshop

- Method: `GET`
- Path: `/organizer/workshops/{workshopId}/registrations`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Query params:
  - `status` (optional): filter by status, default returns active
  - `page` (optional, default `0`)
  - `size` (optional, default `20`)
- Response: `200 OK`, `404 Not Found`

### 8) Registration summary by workshop

- Method: `GET`
- Path: `/organizer/workshops/{workshopId}/registrations/summary`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Response: `200 OK`, `404 Not Found`
- Returns:
```json
{
  "workshopId": "...",
  "capacity": 60,
  "confirmedCount": 45,
  "pendingPaymentCount": 3,
  "activeSeats": 48,
  "remainingSeats": 12
}
```

---

## AI Summary Endpoints (T09)

### Overview

Organizers can upload PDF documents for a workshop. The system extracts text and generates an AI summary via OpenRouter (OpenAI-compatible API).

**Preview endpoints** (any authenticated user) can read summaries on the student workshop detail page.

### 9) Upload PDF & generate summary

- Method: `POST`
- Path: `/ai/workshops/{workshopId}/documents`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Content-Type: `multipart/form-data`
- Max file size: 10 MB
- Accepts: `.pdf` files only
- Request: form field `file` (MultipartFile)
- Response: `200 OK`
```json
{
  "documentId": "UUID",
  "fileName": "workshop-slides.pdf",
  "fileSize": 123456,
  "status": "COMPLETED"
}
```

**Possible status values:**

| Status | Meaning |
|--------|---------|
| `EXTRACTING` | PDF being processed |
| `EXTRACTED` | Text extracted, summarizing... |
| `SUMMARIZING` | AI model generating summary |
| `COMPLETED` | Pipeline finished successfully |
| `NO_TEXT` | PDF has no extractable text (scanned image) |
| `EXTRACTION_FAILED` | PDFBox could not parse the PDF |
| `SUMMARY_FAILED` | AI API returned an error |

### 10) List documents

- Method: `GET`
- Path: `/ai/workshops/{workshopId}/documents`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Response: `200 OK`
```json
[
  {
    "id": "UUID",
    "workshop": { "id": "UUID" },
    "fileUrl": "./data/documents/.../uuid.pdf",
    "fileName": "slides.pdf",
    "mimeType": "application/pdf",
    "fileSize": 123456,
    "processingStatus": "COMPLETED",
    "extractedText": "...",
    "errorMessage": null
  }
]
```

### 11) Get latest summary

- Method: `GET`
- Path: `/ai/workshops/{workshopId}/summary`
- Auth: any authenticated user (students included)
- Response: `200 OK` if summary exists, otherwise `204 No Content`
```json
{
  "summaryId": "UUID",
  "documentId": "UUID",
  "model": "openai/gpt-4o-mini",
  "status": "COMPLETED",
  "summaryText": "Workshop nay tap trung vao... (tom tat 3-5 cau tieng Viet)",
  "errorMessage": null,
  "createdAt": "2026-05-07T12:00:00Z"
}
```

### 12) Re-generate summary

- Method: `POST`
- Path: `/ai/documents/{documentId}/summarize`
- Auth: `ROLE_ORGANIZER` or `ROLE_ADMIN`
- Response: `200 OK` (same shape as get summary)

---

## Response Shape Reference

### `RegistrationResponse`
```json
{
  "id": "UUID",
  "workshopId": "UUID",
  "workshopTitle": "string",
  "status": "CONFIRMED | PENDING_PAYMENT | CANCELLED | EXPIRED",
  "qrToken": "string",
  "qrPayload": "string (URL for QR)",
  "createdAt": "ISO 8601",
  "confirmedAt": "ISO 8601 | null",
  "cancelledAt": "ISO 8601 | null",
  "workshopStartTime": "ISO 8601",
  "workshopEndTime": "ISO 8601"
}
```

### `OrganizerRegistrationSummaryResponse`
```json
{
  "workshopId": "UUID",
  "capacity": "number",
  "confirmedCount": "number",
  "pendingPaymentCount": "number",
  "activeSeats": "number",
  "remainingSeats": "number"
}
```

### `OrganizerRegistrationListResponse`
```json
{
  "items": ["RegistrationResponse..."],
  "page": "number",
  "size": "number",
  "totalElements": "number",
  "totalPages": "number"
}
```

### `DocumentUploadResponse`
```json
{
  "documentId": "UUID",
  "fileName": "string",
  "fileSize": "number",
  "status": "COMPLETED | EXTRACTING | NO_TEXT | EXTRACTION_FAILED | SUMMARY_FAILED"
}
```

### `AiSummaryResponse`
```json
{
  "summaryId": "UUID",
  "documentId": "UUID",
  "model": "string",
  "status": "COMPLETED | FAILED",
  "summaryText": "string | null",
  "errorMessage": "string | null",
  "createdAt": "ISO 8601"
}
```

---

## Status Codes Summary

| Code | Meaning | When |
|------|---------|------|
| 200 | OK | Normal response |
| 201 | Created | Registration created |
| 204 | No Content | Logout successful |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Wrong role |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate, idempotency conflict |
| 429 | Too Many Requests | Rate limited |
| 503 | Service Unavailable | Payment gateway unavailable |
