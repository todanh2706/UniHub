# Đặc tả: Các Tính năng Quản trị (Administration & Organizer Specifications)

**Trạng thái:** Approved
**Thành viên phụ trách:** Nhóm Phát triển UniHub

## 1. Mô tả
Nhóm chức năng Quản trị (Administration) cung cấp công cụ mạnh mẽ dành riêng cho các tài khoản có vai trò quản lý bao gồm Ban tổ chức (**ORGANIZER**) và Quản trị viên (**ADMIN**). Mục tiêu cốt lõi là tự động hóa các tác vụ quản trị thủ công, tăng cường hiệu quả quản lý sinh viên và nâng cao chất lượng hiển thị nội dung workshop thông qua hai tính năng đột phá:
- **Đồng bộ hóa danh sách sinh viên qua CSV (CSV Import & Sync):**
  - Hỗ trợ nhập hàng loạt dữ liệu sinh viên từ các tệp CSV. Quá trình xử lý chạy ngầm (asynchronous) hoàn toàn không gây nghẽn kết nối của người dùng.
  - Tích hợp kiểm tra trùng lặp tệp dựa trên thuật toán băm cơ học **SHA-256 Checksum** để ngăn chặn việc nhập lại tệp đã xử lý.
  - Áp dụng kỹ thuật phân lô (**Batch Persistence**) định kỳ flush bộ nhớ đệm JPA để tránh rò rỉ và tràn RAM (Out of Memory) khi xử lý hàng ngàn bản ghi.
  - Ghi nhận chi tiết từng dòng bị lỗi vào bảng `csv_import_errors` để hỗ trợ đối soát trực quan từ màn hình dashboard quản trị.
- **Tóm tắt nội dung workshop bằng AI (AI Summary Pipeline):**
  - Thiết kế theo mô hình kiến trúc bộ lọc dòng (**Pipe & Filter Pipeline Design Pattern**) để xử lý tuần tự: Upload PDF → Lưu trữ đĩa → Trích xuất văn bản PDF (PdfExtractionService) → Tóm tắt thông tin bằng trí tuệ nhân tạo (OpenRouter API sử dụng mô hình mặc định `openai/gpt-4o-mini`).
  - Điểm nhấn kỹ thuật đặc biệt là cơ chế **Offline Fallback Heuristics**: Nếu kết nối cổng API OpenRouter bị sập hoặc lỗi, hệ thống tự động kích hoạt bộ sinh tóm tắt cục bộ dựa trên phân tích dòng ngữ cảnh để trích xuất tự động (Chủ đề, Diễn giả, Mục tiêu) thành một đoạn tóm tắt tiếng Việt hoàn chỉnh và chuyên nghiệp.

---

## 2. Luồng chính (Happy Path)

### Luồng 1: Đồng bộ hóa danh sách sinh viên bằng CSV (CSV Import)

1. **Client (Web PWA):**
   - Quản trị viên truy cập màn hình `/organizer/csv-sync` và nhấn nút "Bắt đầu Đồng bộ".
   - Giao diện client gửi yêu cầu `POST /api/v1/csv-sync/trigger` lên Backend API.

2. **Backend API (Xử lý Bất đồng bộ):**
   - [CsvSyncController.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/controller/CsvSyncController.java) đón nhận request (đã được bảo vệ bằng `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")`).
   - [CsvSyncService.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/service/CsvSyncService.java) thực hiện các bước:
     1. Sử dụng biến cờ hiệu `AtomicBoolean running` để kiểm tra độc quyền (concurrency check), tránh chạy song song hai tác vụ đồng bộ.
     2. Quét thư mục cấu hình chứa các tệp CSV (`./data/csv`).
     3. Tính toán chuỗi băm SHA-256 của từng tệp. So khớp với dữ liệu cũ trong bảng `csv_import_jobs`. Nếu tệp đã từng được đồng bộ thành công trước đó (checksum trùng khớp), tệp đó sẽ tự động bị bỏ qua.
     4. Khởi tạo bản ghi `CsvImportJob` mới trong Postgres với trạng thái `"PROCESSING"`.
     5. Kích hoạt xử lý ngầm bất đồng bộ bằng `CompletableFuture.runAsync()`.
   - Backend phản hồi ngay lập tức cho Client mã trạng thái HTTP `202 Accepted` đi kèm ID của công việc nhập liệu (`jobId`).

3. **Tiến trình Xử lý nền (Background Processing):**
   - Luồng ngầm đọc tệp CSV bằng mã hóa UTF-8, phân tích dòng tiêu đề (header) để lập bản đồ động các cột (`student_code`, `full_name`, `email`, `faculty`, `major`, `cohort`, `status`).
   - Duyệt qua từng dòng dữ liệu và gọi hàm `upsertStudent()`:
     - Nếu sinh viên đã tồn tại theo mã `studentCode`, hệ thống thực hiện cập nhật toàn bộ thông tin mới và cập nhật thời điểm đồng bộ `lastSyncedAt`.
     - Nếu sinh viên chưa tồn tại, hệ thống chèn mới thực thể `Student`.
   - Mỗi khi xử lý đủ 100 dòng (`batchSize` cấu hình ở `application.yaml`), hệ thống thực thi `entityManager.flush()` và `entityManager.clear()` để làm rải phóng RAM và tối ưu hóa câu lệnh SQL INSERT/UPDATE.

4. **Phản hồi & Cập nhật Trạng thái:**
   - Sau khi hoàn thành duyệt tệp, hệ thống cập nhật trạng thái `CsvImportJob` thành `"COMPLETED"` (hoặc `"PARTIALLY_COMPLETED"` nếu có dòng lỗi).
   - Giao diện Client thực hiện Polling API `/api/v1/csv-sync/jobs/{jobId}` để cập nhật thanh tiến trình (Progress Bar), hiển thị số dòng thành công, thất bại trực quan cho Quản trị viên.

---

### Luồng 2: Tóm tắt nội dung Workshop bằng AI (AI Summary)

1. **Client (Web PWA):**
   - Ban tổ chức đăng tải tệp tài liệu PDF giới thiệu workshop lên màn hình quản trị workshop.
   - Client gửi yêu cầu `POST /api/v1/ai-summary/workshops/{workshopId}/upload` chứa tệp tin nhị phân.

2. **Backend API (Pipeline xử lý):**
   - [AiSummaryService.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/service/ai/AiSummaryService.java) đón nhận request và thực hiện chuỗi xử lý Pipeline:
     - **Stage 1 (Khởi tạo):** Tạo dòng dữ liệu trong bảng `workshop_documents` với trạng thái ban đầu `"EXTRACTING"` để lấy ID UUID tự sinh.
     - **Stage 2 (Lưu trữ đĩa):** Lưu tệp tin nhị phân PDF lên ổ đĩa cứng tại thư mục cấu hình sử dụng chính ID UUID làm tên tệp tin (ví dụ: `./data/documents/{workshopId}/{documentId}.pdf`) để đảm bảo không bị trùng lặp tên tệp.
     - **Stage 3 (Trích xuất văn bản):** [PdfExtractionService](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/service/ai/PdfExtractionService.java) thực hiện đọc tệp PDF và trích xuất toàn bộ văn bản thô, lưu kết quả thô vào DB và cập nhật trạng thái `"EXTRACTED"`.
     - **Stage 4 (Tóm tắt bằng AI):** Gọi [OpenRouterAiService.summarize()](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/service/ai/OpenRouterAiService.java) truyền văn bản thô. Dịch vụ gửi yêu cầu HTTP POST đến cổng OpenRouter API để lấy tóm tắt ngắn gọn 3-5 câu bằng tiếng Việt từ mô hình `openai/gpt-4o-mini`.
     - **Stage 5 (Lưu trữ):** Tạo thực thể `AiSummary` lưu kết quả tóm tắt cuối cùng vào DB. Cập nhật trạng thái tài liệu là `"COMPLETED"`.

3. **Phản hồi:**
   - Trả về HTTP Status `200 OK` cho Client kèm thông tin tóm tắt. Sinh viên khi truy cập trang chi tiết workshop sẽ lập tức nhìn thấy phần tóm tắt ngắn gọn, chuyên nghiệp và cuốn hút do AI tạo ra ở vị trí nổi bật.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Tải lên tệp tin sai định dạng):**
  - *Mô tả:* Người dùng cố tình tải lên tệp tin ảnh hoặc tài liệu không phải `.pdf`, `.md`, hoặc `.txt` để tóm tắt.
  - *Hành động của Hệ thống:* `AiSummaryService` kiểm tra MIME type và phần mở rộng của tệp. Nếu không hợp lệ, ném ra ngoại lệ `IllegalArgumentException` và trả về HTTP Status `400 Bad Request` đi kèm thông báo loại tệp không được chấp nhận.

- **Trường hợp 2 (Lỗi trích xuất văn bản từ PDF hỏng hoặc chứa toàn ảnh):**
  - *Mô tả:* Tệp PDF tải lên bị hỏng cấu trúc hoặc chỉ chứa hình ảnh quét (scanned images) không có văn bản text.
  - *Hành động của Hệ thống:* `PdfExtractionService` ném lỗi hoặc trả về văn bản trống. Hệ thống cập nhật trạng thái tài liệu thành `"EXTRACTION_FAILED"` hoặc `"NO_TEXT"`, lưu thông tin lỗi chi tiết vào DB. Trả về kết quả hiển thị cho người dùng biết tài liệu không thể phân tích văn bản.

- **Trường hợp 3 (Cổng AI OpenRouter bị sập hoặc quá hạn ngạch - Offline Fallback):**
  - *Mô tả:* API Key hết hạn, mất kết nối mạng quốc tế, hoặc OpenRouter API phản hồi mã lỗi không phải `200`.
  - *Hành động của Hệ thống:* Lớp `OpenRouterAiService` bắt được lỗi kết nối hoặc mã lỗi API. Hệ thống lập tức kích hoạt hàm nội bộ `generateFallbackSummary()`. Hàm này tiến hành phân tích ngữ cảnh văn bản tiếng Việt thô đã trích xuất, dò tìm các mẫu tiêu đề, tên diễn giả, mục tiêu, và tự động ráp thành một đoạn tóm tắt chất lượng cao bằng tiếng Việt. Đoạn tóm tắt offline này được lưu vào DB bình thường để đảm bảo người dùng luôn có nội dung tóm tắt xem được trên UI thay vì một ô báo lỗi trống rỗng.

- **Trường hợp 4 (Hai người dùng chạy đồng thời tác vụ đồng bộ CSV):**
  - *Mô tả:* Tác vụ đồng bộ CSV cũ đang chạy dưới nền thì người dùng khác bấm nút kích hoạt đồng bộ mới.
  - *Hành động của Hệ thống:* Biến cờ hiệu `AtomicBoolean running` ngăn chặn bằng cách ném ra ngoại lệ `SyncInProgressException`. Hệ thống trả về lỗi HTTP Status `400 Bad Request` kèm thông điệp báo hiệu tác vụ đồng bộ cũ vẫn đang thực thi, vui lòng thử lại sau.

- **Trường hợp 5 (Tệp CSV bị thiếu cột bắt buộc):**
  - *Mô tả:* Tệp CSV tải lên không chứa cột tiêu đề bắt buộc là `student_code`, `full_name`, hoặc `email`.
  - *Hành động của Hệ thống:* Lớp `CsvSyncService` quét dòng tiêu đề đầu tiên, phát hiện việc thiếu cột. Hệ thống lập tức ghi nhận một dòng lỗi loại `"MISSING_COLUMNS"` vào bảng `csv_import_errors` liên kết với job đó, cập nhật trạng thái `CsvImportJob` là `"FAILED"` và dừng xử lý tệp tin.

---

## 4. Ràng buộc (Constraints)

- **Phân quyền chặt chẽ (RBAC Guard):**
  - Toàn bộ các endpoint tại [CsvSyncController.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/controller/CsvSyncController.java) và [AiSummaryController.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/controller/AiSummaryController.java) bắt buộc phải có chú thích bảo vệ `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")`. Các vai trò không thuộc nhóm này (như `STUDENT` hoặc chưa xác thực) hoàn toàn không có quyền gọi hoặc tương tác với hệ thống.

- **Database Constraints:**
  - Bảng `csv_import_jobs` định nghĩa thuộc tính `file_checksum VARCHAR(255) NOT NULL UNIQUE` đảm bảo việc kiểm soát trùng lặp tệp tin vật lý ở tầng DB.
  - Khóa ngoại `fk_csv_import_errors_job` và `fk_workshop_documents_workshop` đảm bảo tính toàn vẹn dữ liệu tham chiếu khi xóa hoặc thay đổi thực thể.

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo tiến trình đồng bộ CSV chạy ngầm hoàn toàn bất đồng bộ (asynchronous) qua `CompletableFuture`, phản hồi ngay trạng thái `202 Accepted` kèm `jobId` trong vòng dưới 1 giây mà không bắt Client phải chờ đợi lâu.
- [ ] AC2: Đảm bảo cơ chế kiểm tra SHA-256 Checksum hoạt động chính xác, tự động bỏ qua và ghi nhận log rõ ràng đối với các tệp tin CSV đã từng được đồng bộ thành công trước đó trong hệ thống.
- [ ] AC3: Mọi dòng lỗi trong tệp CSV (sai cột, thiếu trường bắt buộc) phải được ghi vết chi tiết vào bảng `csv_import_errors` kèm số dòng thực tế để phục vụ việc kiểm tra của ban tổ chức.
- [ ] AC4: Quy trình tóm tắt tài liệu workshop bằng AI phải thực thi chính xác mô hình Pipeline tuần tự từ khâu trích xuất PDF đến việc gửi yêu cầu lên OpenRouter API.
- [ ] AC5: Đảm bảo cơ chế tự phục hồi ngoại tuyến (Offline Fallback Heuristics) của dịch vụ AI hoạt động ổn định, tự động sinh đoạn tóm tắt tiếng Việt hoàn chỉnh và lưu vào cơ sở dữ liệu khi OpenRouter API bị ngắt kết nối hoặc gặp lỗi timeout.
