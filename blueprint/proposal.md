# UniHub Workshop — Project Proposal

## 1. Vấn đề (Problem Statement)

- **Quản lý phân tán và thủ công:** Quá trình đăng ký qua Google Form thiếu tính đồng bộ, ban tổ chức tốn nhiều giờ để lọc danh sách và gửi email xác nhận thủ công.
- **Tranh chấp tài nguyên (Race Condition):** Google Form không có cơ chế khóa chỗ (lock) theo thời gian thực. Khi có 60 chỗ nhưng hàng trăm sinh viên truy cập cùng lúc, dẫn đến việc nhận quá số lượng (overselling) và gây bức xúc cho sinh viên.
- **Thiếu khả năng chịu tải (Scalability):** Hệ thống thông báo và xử lý hiện tại không chịu được tải trọng lớn khi sự kiện mở đăng ký.
- **Check-in kém hiệu quả:** Việc điểm danh bằng giấy hoặc tra cứu file Excel tại cửa phòng diễn ra chậm chạp, đặc biệt gây ách tắc ở các khu vực sóng yếu hoặc mất mạng.

## 2. Mục tiêu (Objectives)

- **Hiệu năng xử lý:** Đáp ứng an toàn tải trọng đột biến khoảng 12.000 sinh viên truy cập trong 10 phút đầu (với 60% lưu lượng dồn vào 3 phút đầu tiên) mà không bị gián đoạn.
- **Tính toàn vẹn dữ liệu:** Đảm bảo 100% không xảy ra tình trạng "overselling" (bán lố/đăng ký lố chỗ) tại các workshop có giới hạn số lượng.
- **Trải nghiệm người dùng:** Rút ngắn thời gian check-in tại cửa xuống dưới 2 giây/sinh viên thông qua việc quét mã QR.
- **Khả năng phục hồi (Resilience):** Hệ thống check-in phải hoạt động được 100% khi rớt mạng và đồng bộ lại không mất mát dữ liệu khi có kết nối.

## 3. Người dùng và nhu cầu (Users & Needs)

- **Sinh viên:** Cần một giao diện trực quan để xem lịch, số chỗ trống realtime, đăng ký nhanh chóng, nhận mã QR ngay lập tức và được thông báo rõ ràng (Email).
- **Ban tổ chức (Admin):** Cần một Dashboard tập trung để CRUD (Tạo, Đọc, Sửa, Xóa) workshop, xem thống kê realtime. Đặc biệt, cần công cụ AI tóm tắt file PDF để tiết kiệm thời gian viết mô tả sự kiện.
- **Nhân sự check-in:** Cần một ứng dụng di động gọn nhẹ, thao tác đơn giản (chỉ quét QR), hoạt động mượt mà ngay cả khi thiết bị mất kết nối Internet (Offline-first).

## 4. Phạm vi (Scope)

**Trong phạm vi đồ án (In-scope):**

- Xây dựng Web App cho Sinh viên và Ban tổ chức.
- Xây dựng PWA phục vụ quét QR check-in offline.
- Xây dựng Backend API xử lý nghiệp vụ, tích hợp AI Summary (Gemini).
- Giả lập hệ thống đồng bộ CSV (cronjob) nhập dữ liệu sinh viên ban đêm.

**Ngoài phạm vi đồ án (Out-of-scope):**

- Không tích hợp cổng thanh toán thật (Momo/VNPay/Stripe), chỉ xây dựng cơ chế giả lập (Mock Payment Gateway) để test luồng Circuit Breaker và Idempotency.
- Không triển khai hệ thống lên môi trường Production thực tế, chỉ chạy trên môi trường giả lập (Docker).

## 5. Rủi ro và ràng buộc (Risks & Constraints)

- **Tải đột biến (Spiky Traffic):** Nguy cơ sập Backend/Database nếu không có cơ chế Rate Limiting phù hợp.
- **Cổng thanh toán bên thứ 3 không ổn định:** Hệ thống thanh toán mock có thể timeout hoặc sập. Cần có Circuit Breaker để luồng đăng ký miễn phí không bị ảnh hưởng "lây".
- **Giao dịch trùng lặp (Double-charging):** Rủi ro trừ tiền 2 lần khi mạng chập chờn khiến sinh viên bấm retry liên tục (Cần giải quyết bằng Idempotency Key).
- **Xung đột dữ liệu Check-in Offline:** Khi đồng bộ dữ liệu từ nhiều thiết bị offline lên server cùng lúc, cần chiến lược giải quyết xung đột (Conflict Resolution).
- **Tích hợp một chiều (One-way Integration):** File CSV export từ hệ thống cũ có thể bị lỗi format hoặc chứa dữ liệu rác. Hệ thống cronjob cần có cơ chế dung lỗi (Fault Tolerance) để không bị crash toàn bộ tiến trình.
