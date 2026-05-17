# Đặc tả: Tính năng Check-in và Đồng bộ Ngoại tuyến (Offline Check-in & Sync)

**Trạng thái:** Approved
**Thành viên phụ trách:** Nhóm Phát triển UniHub

## 1. Mô tả
Tính năng Check-in là một nghiệp vụ cốt lõi trong UniHub, cho phép nhân viên soát vé/điểm danh (với các vai trò `ADMIN`, `ORGANIZER`, hoặc `CHECKIN_STAFF`) thực hiện ghi nhận sự hiện diện của sinh viên tham gia các buổi workshop.

Để giải quyết vấn đề kết nối mạng không ổn định tại các khu vực tổ chức sự kiện (như hội trường lớn, tầng hầm, hoặc nơi sóng di động yếu), hệ thống được thiết kế theo kiến trúc **Mạng ngoại tuyến trước tiên (Offline-First / Offline-Resilient)**:
- **Ứng dụng Web (PWA):** Sử dụng cơ sở dữ liệu SQLite chạy trực tiếp trên trình duyệt thông qua WebAssembly (`sql.js`), dữ liệu SQLite được export thành mảng nhị phân và lưu trữ bền vững tại `localStorage` để không bị mất khi tải lại trang.
- **Ứng dụng di động (React Native):** Sử dụng cơ sở dữ liệu SQLite nội bộ thông qua thư viện `expo-sqlite` để lưu dữ liệu offline trên thiết bị.
- **Cơ chế Đồng bộ (Sync):** Khi thiết bị trực tuyến (online), tiến trình nền `SyncManager` trên client sẽ tự động thu thập các bản ghi check-in chưa đồng bộ (`synced = 0`) gửi lên API `/api/v1/checkins/sync` dưới dạng một lô (batch). API xử lý từng bản ghi trong một transaction độc lập để đảm bảo tính cô lập lỗi (fault tolerance), đồng thời hỗ trợ kiểm tra trùng lặp (Idempotency) dựa trên trường `clientEventId`.

---

## 2. Luồng chính (Happy Path)

1. **Client (PWA / Mobile App):**
   - Người soát vé quét mã QR của sinh viên (chứa chuỗi mã hóa `qrToken` hoặc link `/api/v1/checkins/qr/{qrToken}`) hoặc bấm xác nhận sự hiện diện thủ công trên danh sách (sử dụng UUID của Registration).
   - Hệ thống Client tự động tạo mã UUID ngẫu nhiên v4 làm định danh duy nhất cho sự kiện check-in (`clientEventId`) và lấy mốc thời gian quét thực tế (`checkedInAt`).
   - Ghi dữ liệu vào bảng `offline_checkins` của SQLite nội bộ với trạng thái `synced = 0`.
   - Nếu Client đang trực tuyến (Online): Trực tiếp kích hoạt luồng đồng bộ bằng cách gom danh sách các check-in chưa sync thành gói tin JSON và gửi yêu cầu `POST /api/v1/checkins/sync` lên Backend.

2. **Backend API:**
   - Spring Security xác thực quyền truy cập của người dùng (yêu cầu vai trò `ADMIN`, `ORGANIZER`, hoặc `CHECKIN_STAFF`).
   - `CheckinController` nhận danh sách các bản ghi check-in từ request body và chuyển đến `CheckinService.syncOfflineCheckins`.
   - `CheckinService` thực hiện duyệt qua từng phần tử trong lô. Với mỗi phần tử, một giao dịch (transaction) riêng được mở ra bằng `TransactionTemplate`.
   - **Bước 1: Kiểm tra tính trùng lặp (Idempotency Check):** Tra cứu bảng `checkins` theo `clientEventId`. Nếu đã tồn tại, bỏ qua việc chèn mới và đánh dấu item này là thành công với trạng thái `ALREADY_SYNCED`.
   - **Bước 2: Tìm kiếm đăng ký (Resolve Registration):** Tách chuỗi `qrToken` từ link QR (nếu có) và tìm kiếm thực thể `Registration` tương ứng trong Postgres DB. Nếu không tìm thấy bằng token, thử phân tích token thành UUID để tìm kiếm trực tiếp theo khóa chính `id`.
   - **Bước 3: Kiểm tra trạng thái đăng ký:** Đảm bảo trạng thái của đăng ký không nằm trong tập hợp các trạng thái không hợp lệ (`CANCELLED`, `EXPIRED`, `CHECKED_IN`, `PENDING_PAYMENT`).
   - **Bước 4: Kiểm tra trùng check-in:** Đảm bảo đăng ký chưa được ghi nhận check-in từ trước (qua thiết bị khác hoặc sự kiện khác).
   - **Bước 5: Lưu thông tin check-in:** Tạo mới thực thể `Checkin` chứa thông tin: đăng ký liên kết (`registration`), người thực hiện soát vé (`checkedInBy`), định danh sự kiện của client (`clientEventId`), nguồn dữ liệu (`source = "OFFLINE_SYNC"`), thời điểm check-in tại client (`checkedInAt`), thời điểm đồng bộ (`synced_at = Instant.now()`). Lưu vào database.
   - **Bước 6: Cập nhật trạng thái đăng ký:** Chuyển trạng thái thực thể `Registration` thành `CHECKED_IN` và gọi hàm `saveAndFlush()` để cập nhật tức thì xuống cơ sở dữ liệu PostgreSQL.

3. **Database/Redis:**
   - Một dòng mới được ghi vào bảng `checkins` trong Postgres DB.
   - Cột `status` của dòng tương ứng trong bảng `registrations` được cập nhật thành `'CHECKED_IN'`.
   - Giao dịch của phần tử đó kết thúc và được commit thành công.

4. **Phản hồi:**
   - Backend API trả về HTTP Status `200 OK` đi kèm JSON chứa hai danh sách: `synced` (các bản ghi đồng bộ thành công hoặc đã trùng lặp) và `errors` (các bản ghi thất bại kèm mã lỗi chi tiết).
   - Client tiếp nhận kết quả:
     - Lọc các `clientEventId` nằm trong danh sách `synced` thành công.
     - Lọc các `clientEventId` bị lỗi vĩnh viễn không thể thử lại (như `INVALID_QR`, `ALREADY_CHECKED_IN`, `REGISTRATION_CANCELLED`, `REGISTRATION_EXPIRED`).
     - Gom cả hai nhóm trên thành danh sách các bản ghi đã giải quyết hoàn tất (`allResolvedIds`) và chạy truy vấn `UPDATE offline_checkins SET synced = 1` xuống SQLite cục bộ để ngăn chặn việc gửi lại trong các lần đồng bộ sau.
     - Ghi nhận và thông báo lỗi với các lỗi thực sự cho nhân viên, đồng thời cập nhật UI danh sách người tham gia sang trạng thái đã check-in.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Trùng lặp clientEventId - Idempotency):**
  - *Mô tả:* Client gửi gói tin sync nhưng gặp sự cố mạng lúc nhận phản hồi, dẫn đến việc gửi lại y hệt gói tin cũ trong lần đồng bộ kế tiếp.
  - *Hành động của Hệ thống:* `CheckinService` truy vấn DB thấy `clientEventId` đã tồn tại. Hệ thống không tạo thêm dòng mới, bỏ qua xử lý và đưa thông tin bản ghi vào danh sách thành công `synced` với trạng thái `ALREADY_SYNCED`. Backend trả về HTTP Status `200 OK`.

- **Trường hợp 2 (Mã QR không hợp lệ - INVALID_QR):**
  - *Mô tả:* Chuỗi mã QR quét được không trùng khớp với bất kỳ `qr_token` hay UUID của `registrations` nào trong cơ sở dữ liệu.
  - *Hành động của Hệ thống:* Hệ thống rollback giao dịch của item này, ghi nhận lỗi với mã lỗi `"INVALID_QR"` và thông điệp `"QR code is invalid or does not match any registration"`. Client nhận phản hồi, hiểu đây là lỗi vĩnh viễn, đánh dấu bản ghi này đã xử lý xong (`synced = 1`) để loại bỏ khỏi hàng chờ sync tiếp theo, đồng thời hiển thị thông báo lỗi trên giao diện cho nhân viên soát vé. Backend trả về HTTP Status `200 OK`.

- **Trường hợp 3 (Đăng ký ở trạng thái không hợp lệ - REGISTRATION_INVALID_STATUS):**
  - *Mô tả:* Sinh viên tham gia check-in nhưng đăng ký của họ đã bị hủy (`CANCELLED`), đã hết hạn (`EXPIRED`), chưa hoàn thành thanh toán (`PENDING_PAYMENT`), hoặc đã được check-in trước đó từ một thiết bị soát vé khác (`CHECKED_IN`).
  - *Hành động của Hệ thống:* Hệ thống rollback giao dịch của item này, trả về mã lỗi thích hợp (ví dụ: `"REGISTRATION_CANCELLED"`, `"ALREADY_CHECKED_IN"`) trong danh sách `errors`. Client nhận phản hồi, đánh dấu bản ghi này đã xử lý xong (`synced = 1`) để dừng thử lại, và cảnh báo nhân viên soát vé về tình trạng vé không hợp lệ. Backend trả về HTTP Status `200 OK`.

- **Trường hợp 4 (Mất kết nối mạng toàn phần trong quá trình đồng bộ):**
  - *Mô tả:* Client đang chạy tiến trình đồng bộ thì thiết bị mất mạng hoàn toàn, hoặc server gặp sự cố không thể truy cập (HTTP 500, Timeout).
  - *Hành động của Hệ thống:* Request gọi API bị lỗi và ném ra ngoại lệ. Thành phần `SyncManager` bắt ngoại lệ này, giữ nguyên trạng thái `synced = 0` của toàn bộ các bản ghi trong SQLite nội bộ. Tiến trình nền tiếp tục lắng nghe sự kiện khôi phục kết nối (`online`) hoặc định kỳ kích hoạt lại luồng đồng bộ sau mỗi 30 giây để gửi lại dữ liệu khi mạng hoạt động bình thường.

- **Trường hợp 5 (Lỗi hệ thống bất ngờ trên một bản ghi đơn lẻ - INTERNAL_ERROR):**
  - *Mô tả:* Xảy ra ngoại lệ nghiêm trọng khi xử lý một dòng dữ liệu (ví dụ: lỗi kết nối DB tạm thời, lỗi phần cứng,...).
  - *Hành động của Hệ thống:* Khối `try-catch` bao quanh transaction của từng item trong `syncOfflineCheckins` sẽ ghi nhận ngoại lệ này, rollback duy nhất item bị lỗi, đưa lỗi `"INTERNAL_ERROR"` vào danh sách phản hồi và tiếp tục xử lý các check-in khác trong danh sách. Lỗi này là lỗi tạm thời (retryable error) nên client sẽ **không** đánh dấu `synced = 1` trong SQLite cục bộ, giữ bản ghi lại để tự động thử đồng bộ lại ở lượt tiếp theo.

---

## 4. Ràng buộc (Constraints)

- **Cơ chế bảo vệ áp dụng:**
  - **Tách biệt Giao dịch (Transactional Isolation):** Mỗi item trong danh sách đồng bộ ngoại tuyến được bao bọc trong một transaction riêng biệt thông qua `TransactionTemplate`. Cơ chế này đảm bảo tính chịu lỗi cao: một bản ghi check-in bị lỗi (do bất cứ nguyên nhân gì) sẽ bị hủy bỏ độc lập mà không ảnh hưởng hoặc làm gián đoạn việc ghi nhận của các bản ghi check-in hợp lệ khác trong cùng một lô.
  - **Bảo vệ tính duy nhất trên Client (Client-Side Idempotency):** Tạo mã UUID v4 duy nhất cho mỗi hành động check-in trên client đảm bảo rằng hệ thống backend có thể phát hiện và ngăn chặn việc ghi nhận lặp lại cùng một hành động check-in trong môi trường phân tán hoặc khi có hiện tượng truyền gửi lại gói tin do sự cố mạng.
  - **Đảm bảo cập nhật tức thì (Immediate Flushing):** Việc gọi `saveAndFlush()` khi cập nhật trạng thái đăng ký của sinh viên đảm bảo các thay đổi được ghi nhận lập tức vào cơ sở dữ liệu, giảm thiểu nguy cơ tranh chấp dữ liệu khi có nhiều hoạt động đồng thời.

- **Database Constraints:**
  - Bảng `checkins` định nghĩa `registration_id UUID NOT NULL UNIQUE` nhằm đảm bảo mỗi lượt đăng ký của một sinh viên đối với một workshop chỉ có tối đa một bản ghi check-in (không thể điểm danh hai lần cho một vé tham gia).
  - Bảng `checkins` định nghĩa `client_event_id VARCHAR(255) NOT NULL UNIQUE` để thực thi cơ chế idempotency ở cấp độ lưu trữ vật lý.
  - Ràng buộc khóa ngoại `fk_checkins_registration` liên kết chặt chẽ bảng `checkins` với bảng `registrations`.
  - Ràng buộc khóa ngoại `fk_checkins_user` đảm bảo thông tin nhân viên thực hiện soát vé (`checked_in_by`) luôn hợp lệ và tồn tại trong bảng `users`.

- **Quyền truy cập (RBAC):**
  - API đồng bộ check-in được bảo mật chặt chẽ bằng chú thích `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER', 'CHECKIN_STAFF')")`. Các vai trò người dùng khác (như `STUDENT` hoặc người dùng chưa xác thực) hoàn toàn không có quyền gọi hoặc tương tác với endpoint này.

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo rằng khi thiết bị ngoại tuyến (offline), nhân viên soát vé vẫn có thể thực hiện quét mã QR hoặc bấm xác nhận điểm danh thủ công, dữ liệu được ghi nhận vào SQLite nội bộ trên trình duyệt (Web PWA) hoặc trên bộ nhớ thiết bị (Mobile App) một cách an sau các lần tải lại trang.
- [ ] AC2: Đảm bảo hệ thống tự động nhận biết trạng thái kết nối mạng được khôi phục (sự kiện `online`) hoặc kích hoạt tiến trình định kỳ mỗi 30 giây để tự động đồng bộ hóa các bản ghi check-in đang chờ xử lý từ SQLite cục bộ lên server.
- [ ] AC3: Xử lý chính xác các trường hợp lỗi nghiệp vụ cấp phần tử (`INVALID_QR`, `ALREADY_CHECKED_IN`, `REGISTRATION_CANCELLED`,...) và trả về trạng thái lỗi chi tiết trong HTTP 200 thay vì làm hỏng toàn bộ yêu cầu mạng (HTTP 4xx/5xx), giúp client dễ dàng phân loại lỗi vĩnh viễn (để đánh dấu đã giải quyết) và lỗi tạm thời (để giữ lại thử lại).
- [ ] AC4: Đảm bảo tính nhất quán và toàn vẹn dữ liệu tuyệt đối nhờ cơ chế Idempotency qua `clientEventId` và cô lập lỗi thông qua việc phân tách transaction đơn lẻ cho từng item.
- [ ] AC5: Hệ thống phải cập nhật chính xác trạng thái thực thể đăng ký (`Registration`) sang `CHECKED_IN` ngay khi đồng bộ thành công, đồng thời ghi lại đầy đủ vết lịch sử bao gồm: định danh người kiểm soát vé (`checked_in_by`), thời gian điểm danh thực tế (`checked_in_at`), thời gian đồng bộ (`synced_at`), nguồn soát vé (`source = "OFFLINE_SYNC"`), và mã thiết bị thực hiện (`device_id`) nếu có.
