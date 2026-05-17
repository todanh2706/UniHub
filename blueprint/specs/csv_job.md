# Đặc tả: Tiến trình Đồng bộ Sinh viên bằng CSV (CSV Synchronization Job)

**Trạng thái:** Approved
**Thành viên phụ trách:** Backend Team & Operations Group

## 1. Mô tả
Tiến trình Đồng bộ Sinh viên bằng CSV (CSV Synchronization Job) là công cụ quản trị đắc lực trong UniHub, giúp Ban tổ chức và Quản trị viên nhanh chóng cập nhật thông tin hàng ngàn sinh viên vào cơ sở dữ liệu từ các tệp tin CSV nguồn. 

Để giải quyết triệt để các hạn chế về thời gian kết nối mạng (Web Timeout) và rủi ro rò rỉ bộ nhớ (Out of Memory - OOM) khi xử lý khối lượng dữ liệu cực lớn, hệ thống áp dụng các giải pháp kỹ thuật sâu sắc:
- **Xử lý ngầm bất đồng bộ (Asynchronous Processing):** Đưa toàn bộ tác vụ đọc và phân tích tệp CSV chạy dưới luồng ngầm của JVM, trả quyền điều khiển về cho Client ngay lập tức.
- **Tự động phòng chống OOM (JPA Session Tuning):** Áp dụng kỹ thuật dọn dẹp bộ đệm định kỳ sau mỗi lô xử lý để duy trì mức RAM ở ngưỡng an toàn.
- **Cô lập lỗi cấp bản ghi (Granular Fault Tolerance):** Một dòng bị lỗi cú pháp hoặc vi phạm ràng buộc dữ liệu sẽ bị bỏ qua và ghi vết chi tiết vào bảng lỗi riêng mà không làm đổ bể hay rollback toàn bộ tệp tin.
- **Tính toán mã băm chống trùng (SHA-256 File Checksum):** Nhận diện tệp tin đã từng đồng bộ thành công để tránh lãng phí tài nguyên nạp lại dữ liệu cũ.

---

## 2. Luồng chính (Happy Path)

1. **Client (Web PWA):**
   - Quản trị viên truy cập trang `/organizer/csv-sync` và nhấn nút "Bắt đầu Đồng bộ".
   - Client gửi yêu cầu HTTP POST đến endpoint `/api/v1/csv-sync/trigger`.

2. **Backend API (Bảo vệ & Phân quyền):**
   - `CsvSyncController` tiếp nhận yêu cầu dưới sự bảo vệ của `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")`.
   - `CsvSyncService` thực thi cơ chế khóa tranh chấp:
     - Sử dụng biến cờ hiệu nguyên tử `AtomicBoolean running` để kiểm tra trạng thái. Nếu cờ đang là `false`, chuyển ngay sang `true` và tiếp tục.
     - Quét thư mục cấu hình chứa các tệp CSV nguồn (ví dụ: `./data/csv`).
     - Với mỗi tệp tìm thấy, tính toán chuỗi SHA-256 Checksum từ nội dung tệp. Tra cứu bảng `csv_import_jobs` để đối khớp. Nếu checksum đã tồn tại và hoàn thành, tệp đó sẽ được bỏ qua.
     - Khởi tạo thực thể `CsvImportJob` mới trong Postgres cho tệp tin mới phát hiện với trạng thái `"PROCESSING"`.
     - Kích hoạt xử lý ngầm bất đồng bộ qua `CompletableFuture.runAsync()`.
   - Backend phản hồi ngay lập tức cho Client mã HTTP `202 Accepted` đi kèm ID của tiến trình (`jobId`) trong vòng dưới 1 giây.

3. **Luồng ngầm xử lý tệp (Background File Processing):**
   - Luồng ngầm mở tệp CSV bằng mã hóa UTF-8. Đọc dòng tiêu đề (header) đầu tiên để lập bản đồ vị trí cột động:
     - Quét tìm vị trí các cột bắt buộc: `student_code`, `full_name`, `email`.
     - Quét tìm vị trí các cột bổ sung nếu có: `faculty`, `major`, `cohort`, `status`.
   - Duyệt qua từng dòng dữ liệu:
     - Phân tích cú pháp dòng CSV thành mảng các cột.
     - Gọi phương thức `upsertStudent()` để lưu dữ liệu: Tra cứu sinh viên theo `studentCode`. Nếu đã tồn tại, tiến hành cập nhật thông tin mới; nếu chưa, chèn mới thực thể `Student` với trạng thái mặc định `"ACTIVE"`.
     - Tăng biến đếm số lượng dòng thành công `successRows`.
     - Cứ sau mỗi 100 dòng (cấu hình qua `batchSize` trong `application.yaml`), thực hiện giải phóng bộ đệm của JPA Hibernate:
       ```java
       entityManager.flush();
       entityManager.clear();
       ```
       Hành động này đẩy các thay đổi xuống DB và giải phóng hoàn toàn các thực thể đã lưu khỏi bộ nhớ RAM để tránh rò rỉ bộ nhớ.

4. **Hoàn tất tác vụ & Cập nhật Trạng thái:**
   - Sau khi đọc hết tệp, hệ thống cập nhật trạng thái `CsvImportJob` thành `"COMPLETED"` (hoặc `"PARTIALLY_COMPLETED"` nếu có dòng lỗi).
   - Client định kỳ gửi yêu cầu `GET /api/v1/csv-sync/jobs/{jobId}` để lấy tiến độ thực tế (tổng số dòng, số dòng thành công, thất bại) và cập nhật thanh tiến trình hiển thị cho Quản trị viên.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Chạy trùng lặp tiến trình - SyncInProgressException):**
  - *Mô tả:* Tác vụ đồng bộ cũ đang chạy dưới nền thì quản trị viên khác nhấn kích hoạt đồng bộ mới.
  - *Hành động của Hệ thống:* Phương thức `running.compareAndSet(false, true)` trả về `false`. Hệ thống lập tức từ chối và ném ra ngoại lệ `SyncInProgressException`. Trả về mã lỗi HTTP Status `400 Bad Request` đi kèm thông điệp báo tác vụ đồng bộ đang diễn ra.

- **Trường hợp 2 (Tệp CSV thiếu cột bắt buộc - MISSING_COLUMNS):**
  - *Mô tả:* Tệp CSV tải lên không chứa một trong các cột tiêu đề bắt buộc: `student_code`, `full_name`, hoặc `email`.
  - *Hành động của Hệ thống:* Trong bước phân tích tiêu đề, hệ thống phát hiện thiếu cột bắt buộc. Hệ thống dừng phân tích tệp ngay lập tức, ghi nhận một dòng lỗi loại `"MISSING_COLUMNS"` vào bảng `csv_import_errors`, cập nhật trạng thái `CsvImportJob` thành `"FAILED"` kèm mốc thời gian hoàn tất để báo cáo trên giao diện.

- **Trường hợp 3 (Dòng dữ liệu thiếu cột bắt buộc - INVALID_COLUMN_COUNT / MISSING_REQUIRED_FIELDS):**
  - *Mô tả:* Tệp tiêu đề hợp lệ, nhưng dòng số 12 chỉ có 2 cột dữ liệu, hoặc dòng số 15 để trống trường `email`.
  - *Hành động của Hệ thống:* Khối `try-catch` bọc quanh dòng bắt được lỗi dữ liệu không hợp lệ. Hệ thống:
    1. Tăng biến đếm số dòng lỗi `failedRows`.
    2. Gọi `recordError()` để chèn một bản ghi mới vào bảng `csv_import_errors` chứa thông tin chi tiết: số dòng thực tế, chuỗi thô của dòng bị lỗi, mã lỗi (`INVALID_COLUMN_COUNT` hoặc `MISSING_REQUIRED_FIELDS`), và nội dung thông điệp mô tả.
    3. Tiếp tục nhảy sang dòng tiếp theo để xử lý bình thường mà không làm hỏng hay rollback các dòng đã nạp thành công trước đó.

- **Trường hợp 4 (Lỗi cú pháp tệp tin CSV - PARSE_ERROR):**
  - *Mô tả:* Dòng dữ liệu bị lỗi dấu ngoặc kép bọc cột không hợp lệ dẫn đến lỗi phân tích cú pháp.
  - *Hành động của Hệ thống:* Bộ phân tích cú pháp ném ngoại lệ, luồng ngầm bắt lỗi, tăng `failedRows`, lưu vết mã lỗi `"PARSE_ERROR"` vào bảng `csv_import_errors` và bỏ qua dòng đó đi tiếp.

- **Trường hợp 5 (Lỗi vi phạm ràng buộc DB khi lưu - UPSERT_ERROR):**
  - *Mô tả:* Lỗi vi phạm khóa chính, trùng lặp email duy nhất hoặc lỗi kết nối DB tạm thời khi thực thi cập nhật bản ghi sinh viên.
  - *Hành động của Hệ thống:* Phương thức `upsertStudent` ném ra ngoại lệ DB. Khối catch bắt được lỗi, tăng `failedRows`, lưu vết lỗi `"UPSERT_ERROR"` kèm thông điệp chi tiết của DB vào bảng `csv_import_errors` để hỗ trợ Ban tổ chức đối soát sau này.

---

## 4. Các Ràng buộc & Tối ưu hóa Hiệu năng (Performance Tuning)

Để xử lý hàng vạn dòng dữ liệu sinh viên một cách mượt mà, `CsvSyncService` tích hợp các giải pháp tối ưu hóa hiệu năng sau:

| Giải pháp tối ưu | Thành phần liên quan | Mục tiêu giải quyết | Cách thức hoạt động |
| :--- | :--- | :--- | :--- |
| **Atomic Exclusive Lock** | `AtomicBoolean running` | Tránh xung đột luồng và ghi đè | Ngăn chặn tuyệt đối việc khởi chạy hai luồng đồng bộ CSV cùng lúc làm nghẽn DB. |
| **SHA-256 Checksum** | Bảng `csv_import_jobs` | Tránh lặp lại công việc cũ | Tính toán mã băm duy nhất của tệp nguồn. Nếu đã khớp với lịch sử công việc thành công, bỏ qua tệp tin đó ngay lập tức. |
| **Granular Exception Handling** | `processFileContent()` | Tăng tính chịu lỗi (Fault Tolerance) | Bao bọc lệnh cập nhật từng dòng bằng khối `try-catch` riêng biệt. Dòng lỗi bị loại bỏ độc lập và lưu vào bảng lỗi riêng mà không gây ảnh hưởng đến các bản ghi hợp lệ khác. |
| **JPA Session Batching** | `entityManager.flush() & clear()` | Chống tràn RAM và rò rỉ bộ nhớ (OOM) | Xóa sạch bộ nhớ đệm Hibernate Context sau mỗi 100 bản ghi được xử lý để thu hồi vùng nhớ RAM tức thì. |

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo tiến trình đồng bộ CSV chạy hoàn toàn dưới nền bất đồng bộ (asynchronous). Endpoint `/api/v1/csv-sync/trigger` phản hồi ngay lập tức HTTP `202 Accepted` kèm ID của job trong vòng dưới 1 giây.
- [ ] AC2: Đảm bảo cơ chế SHA-256 Checksum hoạt động chuẩn xác, tự động nhận biết và bỏ qua các tệp tin CSV đã từng đồng bộ thành công trước đó trong thư mục nguồn.
- [ ] AC3: Mọi lỗi xảy ra trên từng dòng dữ liệu (thiếu cột, sai định dạng, lỗi cập nhật DB) bắt buộc phải được ghi lại chi tiết vào bảng `csv_import_errors` kèm số dòng thực tế để Ban tổ chức đối soát trực quan từ dashboard.
- [ ] AC4: Nếu tệp tin có dòng lỗi, trạng thái cuối cùng của Job phải được cập nhật chính xác là `"PARTIALLY_COMPLETED"`. Nếu toàn bộ tệp tin thành công, trạng thái là `"COMPLETED"`. Nếu tệp hỏng tiêu đề hoặc lỗi hệ thống nghiêm trọng, trạng thái là `"FAILED"`.
- [ ] AC5: Đảm bảo cơ chế JPA Session Batching hoạt động chính xác sau mỗi 100 dòng được xử lý, giải phóng vùng nhớ đệm Hibernate thành công để duy trì mức tiêu thụ RAM ổn định.
