# KỊCH BẢN VIDEO DEMO ĐỒ ÁN UNIHUB WORKSHOP

**Thông số kỹ thuật video:** FullHD (1080p), Bitrate ~720kbps, định dạng MP4.
**Công cụ hỗ trợ cần chuẩn bị sẵn:** * Trình duyệt web (mở sẵn nhiều tab ẩn danh để test Role).
* Postman hoặc Apache JMeter/k6 (để test tải trọng và tranh chấp).
* App điện thoại thật hoặc Emulator (để test check-in offline).
* IDE (mở sẵn source code backend/frontend để show log/code khi cần).

---

### Phân cảnh 1: Giới thiệu & Tổng quan kiến trúc (1 - 2 phút)
* **Người thuyết trình (NĐ - Người Dẫn):** Bật camera, chào thầy.
* **Hành động trên màn hình:** Mở slide High-Level Architecture Diagram hoặc C4 Diagram.
* **Thuyết minh:** * "Chào thầy, nhóm chúng em xin trình bày demo hệ thống UniHub Workshop. Hệ thống được thiết kế theo kiến trúc [nhắc tên kiến trúc, VD: Microservices/Modular Monolith]..."
  * "Trong video này, nhóm sẽ tập trung demo luồng nghiệp vụ chính và cách hệ thống xử lý 5 bài toán cốt lõi: AI Summary, Đồng bộ CSV, Tải đột biến, Thanh toán bất đồng bộ và Check-in Offline."

### Phân cảnh 2: Quản trị, AI Summary & Đồng bộ sinh viên (2 - 3 phút)
* **Hành động:** 1. Đăng nhập tài khoản Admin. Show giao diện thêm Workshop mới.
  2. Upload 1 file PDF giới thiệu Workshop.
  3. Mở tab Terminal/IDE show log hệ thống đang gọi AI model xử lý.
  4. F5 trang chi tiết Workshop, show đoạn tóm tắt do AI tạo ra.
  5. Mở Postman hoặc Terminal, trigger API đồng bộ CSV thủ công (để mô phỏng Job chạy ban đêm).
* **Thuyết minh:**
  * "Đầu tiên là tính năng cho Ban tổ chức. Khi tạo Workshop, admin tải lên file PDF. Backend sẽ trích xuất text và gửi sang AI để sinh ra tóm tắt (AI Summary) hiển thị cho sinh viên."
  * "Về dữ liệu sinh viên, hệ thống có một CronJob chạy hàng đêm để đọc file CSV. Ở đây em sẽ trigger thủ công. Hệ thống đang đọc file, filter các dòng lỗi và upsert vào database mà không làm gián đoạn các luồng khác."

### Phân cảnh 3: Giải quyết tranh chấp chỗ ngồi & Tải đột biến (3 - 4 phút) *[QUAN TRỌNG NHẤT]*
* **Hành động:**
  1. Mở trang đăng ký 1 Workshop chỉ có **60 chỗ**.
  2. Mở Apache JMeter (hoặc script test test tự viết). Bắn **1000 request** đăng ký đồng thời (Concurrency) vào API đăng ký.
  3. Mở database (hoặc trang Admin) show đúng 60 người đăng ký thành công, số lượng còn lại = 0. Không có ai bị âm vé.
  4. Mở Log/Postman bắn thêm vài request liên tục từ 1 IP.
  5. Màn hình trả về lỗi `429 Too Many Requests`. Show nhanh đoạn code cấu hình Rate Limiting.
* **Thuyết minh:**
  * "Để mô phỏng 12.000 sinh viên truy cập đồng thời, em dùng tool bắn 1000 request cùng lúc vào Workshop có 60 slot. Như thầy thấy, hệ thống xử lý hoàn hảo, database ghi nhận chính xác 60 vé, không xảy ra race condition nhờ cơ chế [nhắc tên cơ chế: VD: Database Locking (Pessimistic/Optimistic) hoặc Redis Lua Script]."
  * "Đồng thời, để bảo vệ API không bị sập, nhóm áp dụng Rate Limiting [nhắc tên thuật toán: Token Bucket/Sliding Window]. IP gửi quá nhiều request sẽ lập tức bị chặn ở tầng API Gateway trả về lỗi 429."

### Phân cảnh 4: Xử lý thanh toán lỗi & Idempotency Key (2 - 3 phút)
* **Hành động:**
  1. Login tài khoản Sinh viên, chọn đăng ký Workshop có phí.
  2. Tắt service Payment Gateway ảo (hoặc chỉnh config cho timeout) để mô phỏng lỗi cổng thanh toán.
  3. Bấm đăng ký. Nhận thông báo lỗi lịch sự, UI vẫn hoạt động bình thường, xem lịch bình thường.
  4. Bật lại service. Dùng Postman gửi **2 request thanh toán giống hệt nhau** (cùng `Idempotency-Key` ở Header).
  5. Lần 1 thành công. Lần 2 trả về kết quả y hệt lần 1 nhưng không thực hiện trừ tiền. Show log backend.
* **Thuyết minh:**
  * "Khi cổng thanh toán bên thứ ba sập, hệ thống của nhóm áp dụng Circuit Breaker. Mạch sẽ Mở (Open), ngắt kết nối tạm thời để không kéo sập hệ thống chính, các tính năng xem lịch vẫn hoạt động."
  * "Để chống trừ tiền 2 lần khi client bấm đúp hoặc retry mạng chậm, nhóm sử dụng Idempotency Key. Request thứ 2 cùng Key sẽ bị chặn lại ở tầng Cache hoặc Database, đảm bảo tính toàn vẹn của giao dịch."

### Phân cảnh 5: Nhận vé QR & Check-in Offline (3 phút)
* **Hành động:**
  1. Mở App di động (App của nhân sự check-in) - Tốt nhất là build ra máy ảo hoặc cast màn hình điện thoại thật.
  2. Sinh viên mở Email/App lấy mã QR đăng ký ban nãy.
  3. **TẮT WIFI/4G** trên điện thoại chứa App Check-in.
  4. Quét mã QR của sinh viên. App báo "Check-in thành công (Offline mode)".
  5. **BẬT LẠI WIFI/4G**. Mở trang Admin trên Web.
  6. F5 trang Admin, số lượng check-in đã tự động tăng lên.
* **Thuyết minh:**
  * "Sinh viên sau khi đăng ký thành công sẽ nhận QR code. Ở phía cửa phòng, nhân sự dùng mobile app để quét. Trong trường hợp mất mạng (như em vừa tắt Wifi), app lưu tạm dữ liệu vào Local Database (VD: SQLite/Hive)."
  * "Khi có mạng trở lại, một Background Service trên app sẽ tự động đồng bộ lên Server. Admin lập tức thấy trạng thái sinh viên chuyển sang 'Đã tham dự'."

### Phân cảnh 6: Tổng kết (1 phút)
* **Người thuyết trình:** * "Đó là toàn bộ luồng chạy và cách nhóm giải quyết các bài toán khó của UniHub Workshop. Các tài liệu Blueprint, C4 Model và hướng dẫn setup chi tiết đã được nhóm đính kèm trong thư mục nộp bài. Cảm ơn thầy đã theo dõi."

# KỊCH BẢN VIDEO DEMO ĐỒ ÁN UNIHUB WORKSHOP (BẢN PHÂN VAI)

**Ghi chú quay dựng:** Kịch bản chia làm 4 Clip. Các bạn có thể quay riêng từng Clip, sau đó dùng phần mềm (như CapCut hoặc Premiere) ghép lại, dùng hiệu ứng "Slide" hoặc "Fade" ở các đoạn chuyển cảnh.

---

## CLIP 1: TỔNG QUAN & TÍCH HỢP HỆ THỐNG (Người trình bày: Khoa)

**[Phân cảnh 1: Giới thiệu & Tổng quan kiến trúc]**
* **Hành động trên màn hình:** Mở slide High-Level Architecture Diagram hoặc C4 Diagram.
* **Khoa thuyết minh:** * "Chào thầy, nhóm chúng em gồm Danh và Khoa xin trình bày demo hệ thống UniHub Workshop. Hệ thống được nhóm thiết kế theo kiến trúc [nhắc tên kiến trúc, VD: Microservices/Modular Monolith]."
  * "Trong video này, nhóm sẽ tập trung demo luồng nghiệp vụ chính và cách giải quyết 5 bài toán cốt lõi: AI Summary, Đồng bộ CSV, Tải đột biến, Thanh toán bất đồng bộ và Check-in Offline."

**[Phân cảnh 2: Quản trị, AI Summary & Đồng bộ sinh viên]**
* **Hành động:** 1. Đăng nhập tài khoản Admin, show giao diện tạo Workshop.
  2. Upload 1 file PDF và F5 để show đoạn tóm tắt AI.
  3. Mở Postman/Terminal trigger API đồng bộ CSV.
* **Khoa thuyết minh:**
  * "Đầu tiên là phần quản trị. Khi Ban tổ chức tạo sự kiện và tải lên file PDF giới thiệu, backend sẽ trích xuất nội dung và gọi API sang AI model để tự động sinh ra bản tóm tắt hiển thị cho sinh viên."
  * "Về dữ liệu, do hệ thống cũ của trường không có API, nhóm đã thiết lập một CronJob chạy hàng đêm để đọc file CSV. Em đang trigger job này thủ công. Như thầy thấy ở log, hệ thống đang xử lý hàng loạt dữ liệu, tự động filter dòng lỗi và upsert sinh viên mới vào database mà không làm nghẽn các luồng khác."
  * "Tiếp theo, bạn Danh sẽ demo cách hệ thống xử lý khi có hàng ngàn sinh viên cùng vào đăng ký."

---

## CLIP 2: HIỆU NĂNG & TRANH CHẤP CHỖ NGỒI (Người trình bày: Danh)

**[Phân cảnh 3: Giải quyết tranh chấp chỗ ngồi & Tải đột biến]**
* **Hành động:** 1. Mở trang đăng ký 1 Workshop có đúng **60 chỗ**.
  2. Mở Apache JMeter/k6, chạy script bắn **1000 request** đăng ký đồng thời.
  3. Mở database/Admin show kết quả: đúng 60 người đăng ký, còn lại 0, không ai bị âm vé.
  4. Dùng Postman spam request từ 1 IP để trigger Rate Limit (lỗi 429).
* **Danh thuyết minh:**
  * "Chào thầy, em là Danh. Để mô phỏng kịch bản 12.000 sinh viên truy cập đăng ký cùng lúc, em dùng tool bắn 1000 concurrent requests vào một Workshop chỉ có 60 slot."
  * "Kết quả database ghi nhận chính xác 60 vé, không xảy ra hiện tượng bán lố (overselling) hay race condition. Nhóm đã giải quyết bằng cơ chế [nhắc tên cơ chế: VD: Database Locking / Redis Lua Script]."
  * "Đồng thời, để chống sập server do tải đột biến, nhóm áp dụng Rate Limiting theo thuật toán [nhắc tên thuật toán]. Khi một IP gửi quá nhiều request, API Gateway lập tức chặn và trả về lỗi 429 Too Many Requests như trên màn hình."
  * "Tiếp theo, Khoa sẽ trình bày luồng thanh toán khi đăng ký Workshop có phí."

---

## CLIP 3: LOGIC THANH TOÁN (Người trình bày: Khoa)

**[Phân cảnh 4: Xử lý thanh toán lỗi & Idempotency Key]**
* **Hành động:** 1. Login tài khoản Sinh viên, chọn đăng ký Workshop có phí.
  2. Tắt service cổng thanh toán ảo (mô phỏng mất kết nối). Bấm đăng ký -> Báo lỗi lịch sự, web vẫn hoạt động.
  3. Bật lại service. Dùng Postman gửi **2 request thanh toán giống hệt nhau** (cùng Idempotency-Key).
  4. Lần 1 thành công. Lần 2 trả về kết quả y hệt nhưng không bị trừ tiền thêm.
* **Khoa thuyết minh:**
  * "Khi đăng ký Workshop có phí, nếu cổng thanh toán bên thứ ba gặp sự cố, hệ thống sử dụng Circuit Breaker để ngắt mạch (Open). Điều này giúp các dịch vụ cốt lõi như xem lịch vẫn hoạt động bình thường thay vì bị sập theo."
  * "Ngoài ra, để chống trừ tiền hai lần khi sinh viên bấm đúp hoặc mạng lag tự retry, nhóm cài đặt cơ chế Idempotency Key. Khi em gửi 2 request trùng Key liên tiếp, request thứ 2 sẽ bị chặn lại ở tầng Cache, đảm bảo giao dịch chỉ được xử lý đúng một lần."

### CHECKLIST QA NHANH CHO MOCK PAYMENT FLOW
* **Success flow:** Đăng ký workshop có phí -> vào trang mock provider -> bấm **Simulate Success** -> quay lại `My Registrations` -> trạng thái chuyển `CONFIRMED`, có QR.
* **Fail flow:** Đăng ký workshop có phí -> vào mock provider -> bấm **Simulate Failure** -> quay lại `My Registrations` -> vẫn `PENDING_PAYMENT`, có nút `Retry Payment`.
* **Timeout flow:** Đăng ký workshop có phí -> vào mock provider -> bấm **Simulate Timeout** -> quay lại `My Registrations` -> `Check Payment Status` -> payment chuyển `TIMEOUT` -> `Retry Payment` mở lại checkout.
* **Duplicate submit safety:** Ở các thao tác `Register`, `Pay Now`, `Retry Payment`, `Cancel`, bấm nhanh nhiều lần hoặc refresh chậm -> backend không tạo thêm registration/payment ngoài ý muốn vì request được giữ bằng `Idempotency-Key` ổn định theo action.
* **Late callback safety:** Nếu registration đã `CANCELLED` hoặc payment đã `SUCCEEDED`, gửi lại outcome từ mock provider không được đổi ngược trạng thái hoặc tạo charge mới.
* **Blast radius check:** Khi mock payment bị fail/timeout liên tục, các API xem workshop, xem lịch và các luồng không liên quan vẫn hoạt động bình thường.

---

## CLIP 4: MOBILE & TỔNG KẾT (Người trình bày: Danh)

**[Phân cảnh 5: Nhận vé QR & Check-in Offline]**
* **Hành động:** 1. Mở App di động (bằng Emulator hoặc màn hình cast).
  2. Sinh viên mở mã QR.
  3. **TẮT WIFI/4G** trên điện thoại dùng để check-in. Quét QR -> App báo thành công (Offline).
  4. **BẬT LẠI WIFI/4G**. F5 trang Admin trên Web -> Số lượng tham dự tự động cập nhật.
* **Danh thuyết minh:**
  * "Sau khi đăng ký xong, sinh viên nhận mã QR để check-in tại cửa. Với bài toán khu vực sự kiện mạng không ổn định, app check-in của nhóm được thiết kế để hoạt động Offline. Em vừa tắt kết nối mạng, app vẫn quét và lưu dữ liệu bình thường vào Local Database."
  * "Khi có mạng trở lại, Background Worker trên app sẽ tự động đồng bộ dữ liệu này lên Server. Admin lập tức thấy thông tin cập nhật trên hệ thống."

**[Phân cảnh 6: Tổng kết]**
* **Danh (hoặc cả hai bật camera) thuyết minh:** * "Đó là toàn bộ các luồng nghiệp vụ và giải pháp kỹ thuật chính của hệ thống UniHub Workshop. Các tài liệu thiết kế Blueprint và source code đã được nhóm đính kèm đầy đủ trong thư mục Drive. Chúng em cảm ơn thầy đã theo dõi phần demo."