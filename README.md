# UniHub Workshop - Hệ thống Quản lý và Số hóa Workshop Đại học

## Giới thiệu dự án

UniHub Workshop là giải pháp toàn diện nhằm số hóa quy trình tổ chức chuỗi sự kiện "Tuần lễ kỹ năng và nghề nghiệp" tại môi trường đại học. Hệ thống thay thế các phương thức quản lý thủ công (Google Forms, Email) bằng một nền tảng tập trung, hỗ trợ từ khâu đăng ký, thanh toán đến kiểm soát ra vào (check-in) thực tế.

Dự án tập trung giải quyết các thách thức kỹ thuật lớn như: xử lý tải trọng đột biến (High Traffic), tranh chấp tài nguyên (Race Condition), và đảm bảo hoạt động liên tục trong điều kiện mạng không ổn định (Offline-First).

## Các tính năng chính

### 1. Đăng ký và Quản lý Workshop

- Hiển thị danh sách workshop kèm thông tin diễn giả, phòng và số chỗ trống theo thời gian thực.
- Hỗ trợ đăng ký trực tuyến cho cả workshop miễn phí và có phí.
- Tự động sinh mã QR định danh sau khi đăng ký thành công.

### 2. Hệ thống Check-in Offline

- Ứng dụng di động dành cho nhân sự kiểm soát ra vào.
- Cơ chế lưu trữ đệm (Local Storage) cho phép thực hiện check-in ngay cả khi mất kết nối mạng.
- Tự động đồng bộ hóa dữ liệu về máy chủ sau khi kết nối mạng được phục hồi.

### 3. Tích hợp Trí tuệ nhân tạo (AI Summary)

- Tự động trích xuất nội dung từ các tệp tài liệu PDF giới thiệu workshop.
- Sử dụng mô hình AI để tóm tắt thông tin quan trọng, giúp sinh viên nắm bắt nội dung nhanh chóng trên trang chi tiết.

### 4. Quản trị và Phân quyền (RBAC)

- Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control) cho Sinh viên, Ban tổ chức và Nhân sự check-in.
- Trang admin quản lý toàn bộ vòng đời workshop (tạo mới, chỉnh sửa, hủy) và thống kê số lượng tham dự.

### 5. Đồng bộ dữ liệu định kỳ

- Quy trình tự động nhập (import) dữ liệu sinh viên từ tệp CSV được xuất hàng đêm từ hệ thống cũ để xác thực thông tin đăng ký.

## Giải pháp kỹ thuật và Bảo vệ hệ thống

Để đảm bảo hệ thống hoạt động ổn định dưới áp lực lớn (dự kiến 12.000 truy cập trong 10 phút), các cơ chế sau đã được áp dụng:

- Kiểm soát tải (Rate Limiting): Sử dụng thuật toán phù hợp (như Token Bucket hoặc Sliding Window) để ngăn chặn tình trạng quá tải API backend.
- Chống tranh chấp chỗ ngồi: Áp dụng cơ chế khóa (locking) hoặc xử lý hàng đợi để đảm bảo không xảy ra tình trạng đăng ký vượt quá số lượng chỗ quy định.
- Cơ chế Circuit Breaker: Bảo vệ hệ thống khỏi các sự cố từ bên thứ ba (như cổng thanh toán), cho phép các tính năng khác vẫn hoạt động bình thường khi dịch vụ thanh toán gặp lỗi.
- Tính nhất quán (Idempotency): Đảm bảo các giao dịch tài chính chỉ được thực hiện đúng một lần duy nhất, ngay cả khi người dùng gửi yêu cầu lặp lại nhiều lần do lỗi mạng.

## Công nghệ sử dụng

- Backend: Cấu trúc Microservices hoặc Monolith linh hoạt (Node.js/NestJS hoặc Java Spring Boot).
- Database: PostgreSQL / SQL Server kết hợp với Redis để xử lý bộ nhớ đệm và tranh chấp.
- AI: Google Gemini API / LangChain để xử lý ngôn ngữ tự nhiên.
- Deployment: Docker và Docker Compose để đồng bộ môi trường triển khai.

## Cấu trúc thư mục dự án

- /blueprint: Chứa tài liệu thiết kế hệ thống, sơ đồ C4 và đặc tả nghiệp vụ.
- /src: Mã nguồn chi tiết của ứng dụng Web và Mobile.
- /data: Chứa các script khởi tạo dữ liệu mẫu và các tệp CSV giả lập.

## Thành viên thực hiện

- Danh: Phụ trách Thiết kế kiến trúc, Phát triển Frontend/Mobile và Luồng Check-in Offline.
- Khoa: Phụ trách Phát triển Backend, Thiết kế Database, Cơ chế bảo vệ hệ thống và Tích hợp AI.

---

Dự án được thực hiện như một đồ án môn học tại Trường Đại học Khoa học Tự nhiên - ĐHQG TP.HCM.
