# Đặc tả: Đăng ký Workshop của Sinh viên (Student Workshop Registration)

**Trạng thái:** Approved
**Thành viên phụ trách:** Backend Team & Student Experience Group

## 1. Mô tả
Tính năng Đăng ký Workshop là một trong những nghiệp vụ cốt lõi, có tần suất truy cập cao nhất và nhạy cảm nhất đối với sinh viên trên hệ thống UniHub. 

Để giải quyết triệt để các bài toán khó về mặt kỹ thuật khi hàng ngàn sinh viên cùng nhấn nút đăng ký tại cùng một thời điểm (ví dụ: các workshop giới hạn chỗ ngồi cực kỳ hot), hệ thống UniHub áp dụng kết hợp nhiều giải pháp kiến trúc đồng thời:
- **Ngăn chặn bán lố chỗ (Overbooking):** Sử dụng cơ chế khóa bi quan cấp dòng **Pessimistic Locking (`SELECT FOR UPDATE`)** để tuần tự hóa quá trình kiểm tra và giữ chỗ ngồi.
- **Tránh trùng lịch học (Time Overlapping):** Thuật toán thông minh tự động kiểm tra sự trùng lắp thời gian giữa workshop đăng ký mới và các workshop đã được xác nhận của sinh viên.
- **Chống click đúp và gửi lặp (Double Booking / Double Submission):** Áp dụng bộ lọc Idempotency Key giúp nhận diện các yêu cầu giống hệt nhau, loại bỏ nguy cơ ghi nhận đăng ký thừa hoặc trừ tiền thanh toán 2 lần.
- **Bảo vệ thảm họa quá tải (DDoS / High Traffic Protection):** Sử dụng bộ lọc Rate Limit (Token Bucket) ở tầng biên để chặn đứng các bot/script spam request làm sập máy chủ.

---

## 2. Luồng chính (Happy Path)

### Luồng Đăng ký Workshop Không thu phí (Free Workshop)

1. **Client (Web PWA):**
   - Sinh viên nhấn nút "Đăng ký tham gia" trên giao diện chi tiết workshop.
   - Axios Interceptor tại Client tự động sinh mã UUID v4 ngẫu nhiên, gắn vào tiêu đề `Idempotency-Key` của request.
   - Gửi yêu cầu `POST /api/v1/registrations` kèm Body `{"workshopId": "UUID"}` lên Backend.

2. **Backend API (Bộ lọc biên & Phân quyền):**
   - **Xác thực vai trò:** Spring Security lọc token, đảm bảo người dùng mang vai trò `STUDENT` và trạng thái `ACTIVE` mới được phép tiếp tục.
   - **Rate Limiting:** `RateLimitFilter` kiểm tra hạn mức qua Redis. Yêu cầu hợp lệ được cho qua và trừ đi 1 token.
   - **Idempotency Guard:** `IdempotencyFilter` kiểm tra tính duy nhất của `Idempotency-Key`. Xác nhận đây là khóa mới, tiến hành lưu trạng thái `"IN_PROGRESS"` vào Redis và DB PostgreSQL.

3. **Thực thi nghiệp vụ (Pessimistic Lock & Kiểm tra ràng buộc):**
   - `RegistrationService.createRegistration()` thực hiện:
     - Gọi `workshopRepository.findByIdForUpdate(workshopId)`. Câu lệnh SQL được dịch thành `SELECT ... FROM workshops WHERE id = ? FOR UPDATE`, thiết lập khóa bi quan cấp dòng trên bản ghi Workshop trong PostgreSQL. Các luồng đăng ký khác cho cùng workshop này bắt buộc phải xếp hàng chờ luồng hiện tại hoàn thành.
     - So khớp dải thời gian bắt đầu và kết thúc của workshop để đảm bảo không bị trùng lặp lịch với các workshop sinh viên đã đăng ký hợp lệ trước đó.
     - Đếm số ghế đang chiếm giữ thực tế: `countActiveSeats()` (các đăng ký mang trạng thái `CONFIRMED`, `PENDING_PAYMENT`, `CHECKED_IN` chưa hết hạn).
     - So sánh số ghế thực tế nhỏ hơn `capacity` của workshop.
     - Sinh mã QR soát vé duy nhất `qrToken` và tạo bản ghi đăng ký mới với trạng thái `"CONFIRMED"`.
   - Kết thúc phương thức, Transaction được commit thành công, giải phóng khóa dòng trên bảng `workshops`.

4. **Phản hồi & Thông báo:**
   - Kênh thông báo gửi email xác nhận đăng ký đi kèm hình ảnh mã QR soát vé được kích hoạt ngầm qua **Outbox Pattern**.
   - Cập nhật phản hồi thành công JSON vào cache Redis và bảng `idempotency_keys` của Postgres.
   - Trả về mã HTTP `201 Created` đi kèm dữ liệu đăng ký hoàn chỉnh cho Client.
   - Màn hình Client chuyển trạng thái "Đăng ký thành công", hiển thị mã QR soát vé sắc nét để sinh viên lưu lại.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Spam nút Đăng ký liên tục - RATE_LIMITED):**
  - *Mô tả:* Người dùng hoặc bot gửi hàng chục yêu cầu đăng ký mỗi giây nhằm giật chỗ ngồi.
  - *Hành động của Hệ thống:* `RateLimitFilter` phát hiện token bucket của người dùng/IP bị cạn kiệt. Trực tiếp chặn đứng request tại tầng biên, trả về HTTP Status `429 Too Many Requests` kèm tiêu đề phản hồi `Retry-After: 3` (yêu cầu chờ 3 giây) mà không làm tốn tài nguyên xử lý DB hay ứng dụng.

- **Trường hợp 2 (Gửi lặp lại request khi luồng trước đang chạy - REQUEST_IN_PROGRESS):**
  - *Mô tả:* Kết nối mạng chậm, sinh viên nhấn nút Đăng ký 2 lần liên tục. Request thứ 2 gửi lên khi request thứ 1 vẫn đang chạy trong DB.
  - *Hành động của Hệ thống:* Bộ lọc Idempotency phát hiện `Idempotency-Key` đang có trạng thái `"IN_PROGRESS"`. Hệ thống chặn request thứ 2 ngay lập tức, trả về HTTP Status `409 Conflict` kèm lỗi `"REQUEST_IN_PROGRESS"` bảo vệ tuyệt đối không cho chạy song song 2 transaction đăng ký của cùng một học viên.

- **Trường hợp 3 (Trùng thời gian học - Overlapping Workshop):**
  - *Mô tả:* Sinh viên đã đăng ký thành công một workshop A diễn ra từ 09:00 - 11:00. Sinh viên tiếp tục bấm đăng ký workshop B diễn ra từ 10:00 - 12:00 cùng ngày.
  - *Hành động của Hệ thống:* Hàm `hasTimeOverlap()` trong `RegistrationService.java` truy vấn danh sách đăng ký đang hoạt động của sinh viên, so khớp thấy khoảng thời gian chồng chéo lên nhau. Hệ thống từ chối đăng ký và trả về HTTP Status `409 Conflict` kèm thông điệp `"Student already has an overlapping workshop registration"`.

- **Trường hợp 4 (Hết chỗ ngồi - Workshop is full):**
  - *Mô tả:* Ghế trống cuối cùng của workshop đang được đăng ký. Luồng đăng ký đồng thời khác chạy ngay sau đó.
  - *Hành động của Hệ thống:* Nhờ khóa bi quan `FOR UPDATE`, luồng thứ hai bắt buộc phải đợi luồng thứ nhất hoàn thành. Khi đến lượt luồng thứ hai, hàm `countActiveSeats()` trả về số ghế đã bằng `capacity`. Hệ thống phát hiện workshop đã hết chỗ trống, lập tức rollback transaction và trả về lỗi HTTP Status `409 Conflict` kèm thông báo `"Workshop is full"`, loại bỏ hoàn toàn nguy cơ quá tải đăng ký (Overbooking).

- **Trường hợp 5 (Hết hạn giữ chỗ thanh toán - Awaiting Payment Expiry):**
  - *Mô tả:* Sinh viên đăng ký workshop có phí. Hệ thống giữ ghế trạng thái `PENDING_PAYMENT` trong vòng 15 phút. Sinh viên không thực hiện thanh toán sau thời gian này.
  - *Hành động của Hệ thống:* Ghế giữ chỗ chỉ có giá trị hiệu lực đến mốc `expiresAt`. Khi hết 15 phút, tiến trình nền tự động chuyển trạng thái đăng ký sang `EXPIRED`, giải phóng số ghế trống để cho phép sinh viên khác vào đăng ký bình thường.

---

## 4. Ràng buộc & Các kỹ thuật Chống lỗi Concurrency

Hệ thống UniHub tích hợp các lớp phòng thủ kỹ thuật sâu sắc sau đây để triệt tiêu các lỗi Concurrency:

| Kỹ thuật áp dụng | Vị trí thực thi | Mục tiêu giải quyết | Cách thức hoạt động |
| :--- | :--- | :--- | :--- |
| **Pessimistic Write Lock** | `WorkshopRepository.findByIdForUpdate()` | Chống Overbooking (Bán lố ghế) | Thực thi truy vấn `SELECT ... FOR UPDATE` khóa chặt hàng dữ liệu của Workshop trong database, ép buộc các luồng đăng ký song song của cùng workshop phải xếp hàng tuần tự. |
| **Partial Unique Index** | Database DDL (`V1__init_schema.sql`) | Chống Double Booking (Đăng ký trùng) | Ràng buộc độc nhất vật lý trên cặp cột `(student_id, workshop_id)` chỉ cho phép tối đa một dòng đăng ký hoạt động (`PENDING_PAYMENT`, `CONFIRMED`, `CHECKED_IN`). |
| **Idempotency Replay** | `IdempotencyService.java` | Chống gửi lặp do mạng chậm | Trả về trực tiếp bản lưu đệm kết quả JSON từ Redis/Postgres nếu phát hiện trùng `Idempotency-Key` mà không chạy lại nghiệp vụ hay sinh thêm bản ghi đăng ký mới. |
| **Time Range Overlap Check** | SQL Query tại `RegistrationRepository` | Chống trùng chéo lịch học | Thực hiện kiểm tra giao điểm thời gian giữa workshop mới đăng ký với các workshop cũ đang hoạt động để ngăn sinh viên phân thân học nhiều nơi cùng lúc. |

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo cơ chế khóa bi quan `SELECT ... FOR UPDATE` hoạt động chuẩn xác, không để xảy ra tình trạng số ghế đăng ký thực tế vượt quá sức chứa (`capacity`) của workshop khi chạy thử nghiệm tải cao.
- [ ] AC2: Hệ thống phải phát hiện và từ chối đăng ký thành công nếu dải thời gian của workshop mới bị trùng chéo với bất kỳ workshop nào học viên đã đăng ký hợp lệ và đang hoạt động, trả về HTTP Status `409 Conflict`.
- [ ] AC3: Gửi lại cùng một request đăng ký đi kèm tiêu đề `Idempotency-Key` trùng khớp bắt buộc phải nhận được phản hồi y hệt lần đầu tiên mà không được tạo thêm bản ghi đăng ký hay gọi tạo giao dịch thanh toán mới.
- [ ] AC4: Đối với workshop có phí, ghế ngồi phải được giữ chỗ tạm thời với trạng thái `"PENDING_PAYMENT"` trong đúng 15 phút, và phải được giải phóng tự động sang trạng thái hết hạn nếu sinh viên không thanh toán thành công.
- [ ] AC5: Đảm bảo tích hợp thông suốt với `RateLimitFilter` để chặn đứng các truy cập spam quá 5 yêu cầu đăng ký trong vòng 3 giây trên mỗi tài khoản sinh viên.
