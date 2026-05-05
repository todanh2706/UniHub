# Đặc tả: Đăng ký workshop có phí

**Trạng thái:** Draft
**Thành viên phụ trách:** Backend Team

## 1. Mô tả
Tính năng cho phép sinh viên đăng ký tham gia một workshop có thu phí[cite: 1]. Hệ thống phải đảm bảo không bị quá tải khi mở đăng ký, không xảy ra tình trạng overbook (đăng ký lố chỗ), và chống trừ tiền hai lần khi mạng chập chờn[cite: 1, 3].

## 2. Luồng chính (Happy Path)
1. **Client:** Sinh viên nhấn "Đăng ký". Client sinh một mã UUID v4 và gửi trong header `Idempotency-Key` cùng request POST `/registrations`[cite: 2].
2. **Middleware Auth & RBAC:** Xác thực token và kiểm tra quyền của người dùng (phải có role `STUDENT` và trạng thái `ACTIVE`)[cite: 2].
3. **Middleware Rate Limit:** Kiểm tra Redis Token Bucket[cite: 2]. Trừ 1 token nếu còn hạn mức[cite: 2].
4. **Middleware Idempotency:** Lưu `Idempotency-Key` vào PostgreSQL và Redis với trạng thái `IN_PROGRESS`[cite: 2].
5. **Business Logic - Circuit Breaker:** Kiểm tra trạng thái `cb:payment_gateway:state` trong Redis[cite: 2]. Trạng thái hiện tại là `CLOSED`[cite: 2].
6. **Database Transaction:**
   - Mở transaction, thực hiện `SELECT * FROM workshops WHERE id = ? FOR UPDATE` để khóa dòng (row-level lock)[cite: 2].
   - Đếm số lượng đăng ký hợp lệ (status là `CONFIRMED` hoặc `PENDING_PAYMENT` chưa hết hạn)[cite: 2].
   - Kiểm tra số lượng này phải nhỏ hơn `capacity` của workshop[cite: 2].
   - Tạo bản ghi trong bảng `registrations` với `status = 'PENDING_PAYMENT'` và `expires_at` là thời điểm hiện tại cộng thêm 15 phút[cite: 2].
   - Commit transaction[cite: 2].
7. **Khởi tạo thanh toán:** Gọi API của Mock Payment Gateway kèm theo `Idempotency-Key` để tạo giao dịch[cite: 2, 3].
8. **Phản hồi:** Cập nhật kết quả vào bảng `idempotency_keys` và Redis[cite: 2]. Trả về HTTP 200 kèm thông tin thanh toán cho Client[cite: 2].

## 3. Kịch bản lỗi (Error Scenarios)
- **Tải đột biến:** Nếu vượt ngưỡng giới hạn của Token Bucket, hệ thống trả về mã lỗi `HTTP 429 Too Many Requests` kèm header `Retry-After`[cite: 2]. Client dùng thông tin này để tạm khóa nút đăng ký[cite: 2].
- **Cổng thanh toán lỗi liên tục:** Nếu Circuit Breaker ở trạng thái `OPEN`, API trả về mã lỗi `HTTP 503 PAYMENT_UNAVAILABLE` và từ chối tạo đăng ký (không giữ chỗ)[cite: 2].
- **Hết chỗ (Overbook):** Trong Database Transaction, nếu số lượng đăng ký bằng hoặc vượt `capacity`, hệ thống rollback và trả về lỗi nghiệp vụ (hết chỗ)[cite: 2].
- **Client retry liên tục:**
  - Nếu request trước đang xử lý: Middleware Idempotency trả về mã lỗi `409 REQUEST_IN_PROGRESS` kèm header `Retry-After`[cite: 2].
  - Nếu body payload bị thay đổi so với request gốc: Trả về mã lỗi `409 IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST`[cite: 2].
  - Nếu request trước đã có kết quả (Thành công/Lỗi nghiệp vụ): Replay lại response cũ từ Redis hoặc PostgreSQL[cite: 2].
- **Payment Gateway Timeout:** Nếu gọi gateway timeout sau khi đã giữ chỗ, hệ thống không expire registration ngay[cite: 2]. Registration giữ trạng thái `PENDING_PAYMENT` đến khi hết TTL 15 phút, sinh viên có thể retry kiểm tra kết quả[cite: 2].

## 4. Ràng buộc (Constraints)
- **Cơ chế bảo vệ áp dụng:**
  - Rate Limit: Áp dụng per-user (5 request/3 giây), per-IP (90 request/phút), và global cap (300-500 request/giây)[cite: 2].
  - Idempotency: Lưu trữ trong PostgreSQL và cache Redis (TTL 1 giờ)[cite: 2].
  - Circuit Breaker: Chuyển sang `OPEN` sau 5 lỗi liên tiếp, thời gian mở là 30 giây[cite: 2].
- **Database Constraints:** 
  - Khóa dòng bằng lệnh `SELECT ... FOR UPDATE` trên bảng `workshops`[cite: 2].
  - Ràng buộc Partial unique index `uq_active_registration` trên `(student_id, workshop_id)` cho các trạng thái `PENDING_PAYMENT` và `CONFIRMED`[cite: 2].
- **Quyền truy cập (RBAC):** Chỉ user có role `STUDENT` mới được truy cập endpoint này[cite: 2].

## 5. Tiêu chí chấp nhận (Acceptance Criteria)
- [ ] AC1: Đảm bảo rằng khi workshop đã đủ `capacity`, hệ thống từ chối mọi yêu cầu đăng ký mới và không xảy ra overbook.
- [ ] AC2: Hệ thống trả về lỗi `503 PAYMENT_UNAVAILABLE` ngay lập tức nếu Payment Gateway Circuit Breaker đang ở trạng thái `OPEN`.
- [ ] AC3: Gửi lại cùng một request (trùng payload và `Idempotency-Key`) phải nhận được cùng một kết quả như lần gửi đầu tiên, không tạo thêm bản ghi `registrations`.
- [ ] AC4: Sau 15 phút, nếu giao dịch thanh toán không thành công, worker hệ thống phải tự động chuyển trạng thái đăng ký sang `EXPIRED` để giải phóng chỗ[cite: 2].