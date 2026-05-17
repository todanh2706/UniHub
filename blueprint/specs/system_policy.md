# Đặc tả: Cơ chế Bảo vệ Hệ thống (System Protection & Resilience Policies)

**Trạng thái:** Approved
**Thành viên phụ trách:** Nhóm Phát triển UniHub

## 1. Mô tả
Để đảm bảo tính sẵn sàng, khả năng chịu tải và tính toàn vẹn dữ liệu trước các cuộc tấn công DDoS, lưu lượng truy cập tăng đột biến (High Traffic), và sự cố của các dịch vụ bên thứ ba (như cổng thanh toán), UniHub tích hợp 3 cơ chế bảo vệ hệ thống cốt lõi:
- **Giới hạn tần suất (Rate Limiting):** Sử dụng thuật toán **Token Bucket** phân tán thông qua việc chạy script Lua nguyên tử trên Redis. Hệ thống có khả năng tự động chuyển đổi sang cơ chế dự phòng cục bộ (Local Fallback) sử dụng thư viện `Bucket4j` trong bộ nhớ RAM nếu Redis gặp sự cố.
- **Khóa trùng lặp (Idempotency Key):** Áp dụng cho toàn bộ các API thay đổi trạng thái hệ thống (`POST`, `PUT`, `PATCH`, `DELETE`) để tránh việc trùng lặp dữ liệu do gửi lại yêu cầu (ví dụ: nhấn nút Thanh toán/Đăng ký hai lần). Trạng thái của khóa được lưu song song trên Redis (để phản hồi nhanh) và PostgreSQL (để lưu trữ bền vững).
- **Cầu chì bảo vệ (Circuit Breaker):** Sử dụng thư viện `Resilience4j` bao bọc các cuộc gọi tích hợp cổng thanh toán bên thứ ba. Cơ chế này tự động ngắt kết nối (chuyển sang trạng thái `OPEN`) khi phát hiện tỷ lệ lỗi tăng cao, tránh làm treo tài nguyên hệ thống (thread pool, database connection) và tự động khôi phục dần dần khi cổng thanh toán ổn định trở lại.

---

## 2. Luồng chính (Happy Path)

### Luồng Hoạt động Tổng hợp của Hệ thống Bảo vệ

1. **Client (Web PWA / Mobile App):**
   - Client gửi một yêu cầu `POST /api/v1/payments` để thực hiện thanh toán cho đăng ký workshop.
   - Yêu cầu đính kèm tiêu đề `Idempotency-Key` với giá trị UUID v4 được sinh tự động bởi Axios Interceptor tại  và đính kèm access token định danh người dùng.

2. **Backend API (Bộ lọc và Xử lý nghiệp vụ):**
   - **Giai đoạn 1: Xác thực Idempotency (Idempotency Filter):**
     -  tiếp nhận request, lấy ra giá trị `Idempotency-Key` từ header.
     -  thực hiện tính toán hàm băm SHA-256 của Request Body.
     - Tra cứu trạng thái của khóa trên Redis trước. Nếu không có trong Redis, tra cứu tiếp trong Postgres.
     - Phát hiện đây là khóa mới hoàn toàn (chưa từng được sử dụng). Hệ thống tiến hành "Giữ chỗ" (Reserve) khóa này bằng cách chèn một dòng vào bảng `idempotency_keys` với trạng thái đang xử lý (`responseBody = null`, `statusCode = 202`), đồng thời ghi nhận giá trị `"IN_PROGRESS"` vào Redis với TTL là 1 giờ.
   - **Giai đoạn 2: Giới hạn Tần suất (Rate Limit Filter):**
     -  kiểm tra các cấu hình chính sách được nạp từ .
     - Định danh người dùng truy cập (`USER` scope) thông qua tên tài khoản đăng nhập (email) thu được từ Spring Security Context.
     - Gọi  để thực thi script Lua nguyên tử trên Redis. Script thực hiện lấy bucket, tính toán số token tích lũy dựa trên thời gian trôi qua, và trừ đi 1 token.
     - Token được tiêu thụ thành công (vẫn nằm trong giới hạn). Bộ lọc cho phép request tiếp tục đi vào Controller.
   - **Giai đoạn 3: Thực thi nghiệp vụ và Cầu chì bảo vệ (Circuit Breaker):**
     - Controller định tuyến yêu cầu thanh toán đến .
     - Hệ thống gọi API của cổng thanh toán thực tế thông qua .
     -  kiểm tra trạng thái hiện tại của cầu chì là `CLOSED` (bình thường), tiến hành thực hiện cuộc gọi.
     - Cổng thanh toán phản hồi thành công tức thì. Circuit Breaker ghi nhận một giao dịch thành công vào cửa sổ trượt (sliding window).

3. **Database/Redis:**
   - Cập nhật số token còn lại trong Redis Hash của Rate Limiting.
   - Hoàn tất xử lý Idempotency: `IdempotencyService.complete()` thực hiện cập nhật chuỗi JSON của Response Body và mã trạng thái HTTP trả về vào dòng tương ứng trong bảng `idempotency_keys` của Postgres DB, đồng thời lưu đè chuỗi JSON này thay thế chữ `"IN_PROGRESS"` trong bộ nhớ đệm Redis (TTL 1 giờ).

4. **Phản hồi:**
   - Trả về HTTP Status `200 OK` cho Client kèm dữ liệu giao dịch.
   - Client nhận phản hồi bình thường. Nếu người dùng gửi lại đúng yêu cầu này lần hai trong vòng 1 giờ, bộ lọc Idempotency Filter sẽ trực tiếp lấy chuỗi JSON đã lưu trong Redis/Postgres trả về ngay lập tức ở bước đầu tiên mà không chạy lại nghiệp vụ hay gọi cổng thanh toán.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Vượt quá tần suất cho phép - RATE_LIMITED):**
  - *Mô tả:* Người dùng hoặc IP liên tục gửi yêu cầu đăng ký/thanh toán vượt mức giới hạn quy định.
  - *Hành động của Hệ thống:* Script Lua xác định số lượng token còn lại bằng `0`. `RateLimitFilter` chặn yêu cầu ngay lập tức, thiết lập HTTP Status `429 Too Many Requests`. Gắn các tiêu đề phản hồi tiêu chuẩn: `Retry-After` (thời gian chờ giây), `X-RateLimit-Limit`, `X-RateLimit-Reset` và trả về JSON lỗi `{"error":"RATE_LIMITED","message":"..."}`. Yêu cầu không đi qua các bộ lọc xác thực hay controller nghiệp vụ khác.

- **Trường hợp 2 (Gửi lặp lại yêu cầu đang xử lý - REQUEST_IN_PROGRESS):**
  - *Mô tả:* Người dùng nhấn nút Thanh toán lần 1, kết nối mạng chậm. Người dùng nhấn nút Thanh toán lần 2 ngay lập tức với cùng tiêu đề `Idempotency-Key` khi luồng xử lý lần 1 vẫn đang chạy.
  - *Hành động của Hệ thống:* `IdempotencyService` kiểm tra trạng thái khóa trên Redis/Postgres thấy giá trị hiện tại là `"IN_PROGRESS"` (hoặc `responseBody = null` trong DB). Hệ thống ném ra `IdempotencyConflictException` với loại `REQUEST_IN_PROGRESS`. Bộ lọc bắt lỗi và trả về HTTP Status `409 Conflict` đi kèm JSON báo lỗi `"REQUEST_IN_PROGRESS"`, ngăn không cho chạy song song hai luồng xử lý trùng lặp trên cùng một vé/hóa đơn thanh toán.

- **Trường hợp 3 (Sử dụng lại Idempotency Key với Request Body khác):**
  - *Mô tả:* Client gửi yêu cầu thanh toán mới nhưng do lỗi lập trình sử dụng lại mã `Idempotency-Key` của một giao dịch cũ có nội dung/số tiền khác.
  - *Hành động của Hệ thống:* `IdempotencyService` tính toán băm SHA-256 của Body request mới gửi lên và so sánh với giá trị băm `requestHash` đã lưu trữ trong cơ sở dữ liệu Postgres cho khóa đó. Phát hiện sự sai lệch hàm băm, hệ thống ném ra `IdempotencyConflictException` loại `KEY_REUSED_WITH_DIFFERENT_REQUEST`. Bộ lọc chặn lại và phản hồi HTTP Status `409 Conflict` kèm thông tin lỗi chi tiết.

- **Trường hợp 4 (Cổng thanh toán lỗi liên tục kích hoạt mở Cầu chì - Circuit Breaker OPEN):**
  - *Mô tả:* Cổng thanh toán bên thứ ba bị sập hoặc gặp lỗi timeout kéo dài.
  - *Hành động của Hệ thống:*
    1. Khi phát hiện tỷ lệ cuộc gọi lỗi (hoặc cuộc gọi chậm > 3s) đạt mức 50% trong cửa sổ trượt 5 cuộc gọi gần nhất, `paymentCircuitBreaker` tự động chuyển trạng thái từ `CLOSED` sang `OPEN`.
    2. Một sự kiện chuyển trạng thái được kích hoạt và lưu vào bảng `circuit_breaker_events` để giám sát.
    3. Từ thời điểm này, mọi yêu cầu thanh toán mới đi qua `PaymentService` sẽ bị Circuit Breaker chặn đứng ngay lập tức tại cổng và ném ra `PaymentGatewayUnavailableException` mà không thực hiện bất kỳ cuộc gọi mạng nào đến cổng thanh toán bị hỏng.
    4. Trạng thái thanh toán của hóa đơn được đặt là `"PENDING"`. Hệ thống phản hồi lỗi HTTP Status `503 Service Unavailable` kèm tiêu đề khuyên dùng `Retry-After: 30` (thử lại sau 30 giây).
    5. Sau thời gian chờ 30 giây ở trạng thái `OPEN`, cầu chì tự động chuyển sang trạng thái `HALF_OPEN`. Hệ thống cho phép đúng 1 yêu cầu thực tế đi qua để kiểm tra. Nếu thành công, cầu chì đóng lại (`CLOSED`); nếu thất bại, nó tiếp tục mở (`OPEN`) và chờ thêm 30 giây nữa.

- **Trường hợp 5 (Redis gặp sự cố bất ngờ - Rate Limit Fallback):**
  - *Mô tả:* Cụm Redis cache bị mất kết nối hoặc sập hoàn toàn.
  - *Hành động của Hệ thống:* Khối `try-catch` trong `RateLimiterService.tryConsume` bắt toàn bộ ngoại lệ kết nối Redis. Để tránh làm gián đoạn hệ thống và ngăn cản người dùng truy cập hợp lệ, hệ thống tự động chuyển hướng cơ chế Rate Limiting sang bộ lưu trữ cục bộ dự phòng (**Local Fallback**). Nó khởi tạo một `Bucket` từ thư viện `Bucket4j` được lưu trữ trong một `ConcurrentHashMap` trong bộ nhớ RAM của server để tiếp tục thực hiện giới hạn tần suất cho người dùng tại server đó.

---

## 4. Ràng buộc (Constraints)

- **Cơ chế bảo vệ áp dụng:**
  - **Token Bucket phân tán (Atomic Redis Lua Script):** Đảm bảo cơ chế giới hạn tần suất hoạt động chính xác và đồng bộ trên môi trường đa cụm server (distributed environment), tránh tình trạng phân bổ tải không đều.
  - **Khóa trùng lặp lưỡng cực (Redis + PostgreSQL):** Sử dụng Redis cho phép kiểm tra trùng lặp nhanh chóng (chỉ mất vài mili giây). Lưu vào PostgreSQL đảm bảo tính bền vững của kiểm tra idempotency ngay cả khi Redis bị khởi động lại hoặc xóa cache.
  - **Cửa sổ trượt dựa trên số lượng (Count-based Sliding Window):** Thiết lập `slidingWindowSize(5)` và `minimumNumberOfCalls(5)` đảm bảo phản ứng nhanh nhạy của cầu chì trước các sự cố sập cổng thanh toán (chỉ cần 3 cuộc gọi lỗi liên tiếp trong 5 cuộc gọi là cầu chì sẽ mở lập tức).

- **Database Constraints:**
  - Bảng `idempotency_keys` định nghĩa ràng buộc `key VARCHAR(255) NOT NULL UNIQUE` để tránh việc ghi nhận trùng lặp khóa từ cơ chế DB vật lý.
  - Bảng `circuit_breaker_events` ghi nhận chính xác lịch sử chuyển đổi trạng thái làm cơ sở kiểm tra và phân tích hệ thống.

- **Quyền truy cập (RBAC / Phân cấp bảo vệ):**
  - Giới hạn tần suất được cấu hình linh hoạt theo từng phạm vi (`scope`):
    - **IP Scope:** Bảo vệ hệ thống ở cấp độ mạng trước các cuộc tấn công quét (DDoS), áp dụng cho các API nhạy cảm như `/api/v1/auth/login` (chặn brute force) và `/api/v1/registrations`.
    - **USER Scope:** Bảo vệ hệ thống khỏi việc spam tài nguyên từ các tài khoản đã đăng nhập, áp dụng cho API `/api/v1/payments` (giới hạn 3 lần thanh toán trong 10 giây).

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo bộ lọc `RateLimitFilter` hoạt động chính xác theo cấu hình chính sách trong `application.yaml`, trả về đúng mã lỗi HTTP `429 Too Many Requests` kèm tiêu đề `Retry-After` khi người dùng vượt ngưỡng tần suất.
- [ ] AC2: Đảm bảo cơ chế tự động chuyển đổi sang Local Fallback (sử dụng in-memory `Bucket4j`) của Rate Limit hoạt động trơn tru mà không làm sập luồng yêu cầu của người dùng khi Redis ngắt kết nối.
- [ ] AC3: Mọi yêu cầu nghiệp vụ thay đổi trạng thái có tiêu đề `Idempotency-Key` đều phải được bảo vệ. Nếu gửi lặp lại yêu cầu khi luồng đầu tiên đang xử lý, hệ thống bắt buộc phải trả về lỗi HTTP `409 Conflict` với mã lỗi `REQUEST_IN_PROGRESS`.
- [ ] AC4: Nếu một yêu cầu trùng lặp được gửi lên sau khi yêu cầu ban đầu đã hoàn thành xử lý, hệ thống phải trực tiếp trả về kết quả đã được lưu cache trước đó với HTTP Status `200 OK` (hoặc mã trạng thái nguyên bản) mà không thực thi lại bất kỳ mã nguồn Controller nào.
- [ ] AC5: Cầu chì bảo vệ cổng thanh toán phải tự động chuyển sang trạng thái `OPEN` khi phát hiện tỷ lệ lỗi đạt 50% trong 5 cuộc gọi gần nhất, ngắt ngay lập tức mọi kết nối và phản hồi lỗi HTTP `503 Service Unavailable` đến khách hàng để bảo vệ tài nguyên hệ thống, đồng thời ghi lại sự kiện vào bảng `circuit_breaker_events`.
