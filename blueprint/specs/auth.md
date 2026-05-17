# Đặc tả: Phân quyền & Xác thực (Authentication & Authorization)

**Trạng thái:** Approved
**Thành viên phụ trách:** Nhóm Phát triển UniHub

## 1. Mô tả
Hệ thống xác thực và phân quyền của UniHub được thiết kế theo mô hình **Stateless Token-Based Authentication** sử dụng cặp mã thông báo **Access Token (JWT)** và **Refresh Token (Database-backed)**. Hệ thống cung cấp cơ chế bảo vệ tài nguyên chặt chẽ ở cả cấp độ Role-Based Access Control (RBAC) và Permission-Based Access Control (Fine-Grained Permissions) cho tất cả các nền tảng bao gồm Web Client (PWA) và Mobile App.

Các thành phần cốt lõi của kiến trúc bao gồm:
- **Access Token (JWT):** Được lưu trữ tạm thời tại bộ nhớ Client và `localStorage`. Token có thời gian sống ngắn (mặc định 1 ngày) chứa thông tin định danh và được đính kèm vào tiêu đề `Authorization: Bearer <token>` cho mỗi yêu cầu.
- **Refresh Token:** Được tạo ngẫu nhiên dưới dạng UUID v4, lưu trữ bền vững tại bảng `refresh_tokens` trong database PostgreSQL với thời hạn sống dài hơn (mặc định 7 ngày). Refresh token được dùng để tự động cấp mới Access Token mà không làm gián đoạn trải nghiệm của người dùng.
- **Phân quyền Kép (Dual Authorization Model):** Kết hợp phân quyền theo Vai trò (Roles: `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`) và phân quyền chi tiết theo Hành động (Permissions: `WORKSHOP_CREATE`, `VIEW_WORKSHOPS`,...) nhằm tăng tính linh hoạt và bảo mật tối đa.

---

## 2. Luồng chính (Happy Path)

### Luồng Đăng nhập (Login Flow)

1. **Client (Web PWA / Mobile App):**
   - Người dùng nhập email và mật khẩu tại giao diện Đăng nhập và gửi yêu cầu `POST /api/v1/auth/login`.

2. **Backend API:**
   - `AuthController` tiếp nhận và chuyển yêu cầu đến `AuthService.login`.
   - `AuthService` gọi `AuthenticationManager.authenticate()` để kiểm tra thông tin đăng nhập:
     - Tra cứu thông tin người dùng trong `UserRepository` theo Email.
     - Kiểm tra trạng thái tài khoản (`status == "ACTIVE"` và không bị khóa `LOCKED`).
     - So khớp mật khẩu đã nhập với mã băm mật khẩu (`passwordHash`) trong database thông qua `PasswordEncoder` (BCrypt).
   - Truy vấn toàn bộ danh sách Vai trò (`Role`) và Quyền chi tiết (`Permission`) của người dùng từ cơ sở dữ liệu.
   - Tạo mã **Access Token (JWT)** bằng `JwtService.generateToken()`, nhúng email và thời điểm hết hạn vào claims của JWT.
   - Sinh **Refresh Token** ngẫu nhiên dưới dạng chuỗi UUID v4, tạo thực thể `RefreshToken` chứa thông tin người dùng, thời điểm hết hạn (mặc định 7 ngày sau), và lưu vào `RefreshTokenRepository`.

3. **Database/Redis:**
   - Một dòng dữ liệu mới về Refresh Token được chèn vào bảng `refresh_tokens` trong Postgres.
   - Các bảng liên quan (`users`, `user_roles`, `role_permissions`) được truy vấn đọc để tải thông tin người dùng và phân quyền.

4. **Phản hồi:**
   - Backend API trả về HTTP Status `200 OK` đi kèm JSON `AuthResponse` chứa: `token` (JWT Access Token), `refreshToken` (chuỗi UUID), `email`, `firstName`, `lastName`, và danh sách các vai trò `roles`.
   - Client tiếp nhận kết quả:
     - Lưu Access Token (`token`) và Refresh Token (`refreshToken`) vào `localStorage`.
     - Cập nhật trạng thái xác thực (`isAuthenticated = true`) và thông tin người dùng trong kho lưu trữ trạng thái **Zustand** (`useAuthStore`).
     - Định tuyến người dùng đến trang chủ tương ứng với vai trò của họ thông qua `ProtectedRoute`.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Access Token hết hạn - Luồng Tự động Làm mới Token):**
  - *Mô tả:* Access Token đính kèm trong request gửi lên bị hết hạn hoặc không hợp lệ, dẫn đến việc Backend trả về lỗi xác thực.
  - *Hành động của Hệ thống:*
    1. Backend API trả về HTTP Status `401 Unauthorized` thông qua `JwtAuthenticationFilter`.
    2. Axios Response Interceptor trên Client bắt được lỗi `401` và nhận biết đây là yêu cầu cần làm mới (chưa gắn cờ `_retry`).
    3. Đánh dấu cờ `originalRequest._retry = true` để ngăn chặn vòng lặp vô hạn.
    4. Client tự động gửi yêu cầu `POST /api/v1/auth/refresh` bằng một thực thể Axios độc lập, truyền tham số `refreshToken` lấy từ `localStorage`.
    5. Tại Backend, `AuthService.refreshToken` kiểm tra tính hợp lệ của Refresh Token trong DB (chưa hết hạn, chưa bị thu hồi). Nếu hợp lệ, sinh Access Token mới dựa trên thông tin người dùng liên kết.
    6. Backend trả về HTTP Status `200 OK` cùng Access Token mới.
    7. Client cập nhật Access Token mới vào `localStorage`, cập nhật tiêu đề `Authorization: Bearer <new_token>` cho yêu cầu ban đầu (`originalRequest`) và thực thi lại yêu cầu này để trả kết quả trơn tru cho người dùng.

- **Trường hợp 2 (Refresh Token hết hạn hoặc bị thu hồi):**
  - *Mô tả:* Refresh Token gửi lên để làm mới Access Token đã hết hạn (quá 7 ngày) hoặc đã bị đánh dấu thu hồi (`revoked_at IS NOT NULL`) do người dùng đã đăng xuất hoặc hệ thống hủy phiên.
  - *Hành động của Hệ thống:*
    1. Backend API kiểm tra DB thấy Refresh Token hết hạn hoặc đã thu hồi, ném ngoại lệ và xóa bản ghi đó trong DB (nếu hết hạn). Trả về HTTP Status `400 Bad Request` hoặc `401 Unauthorized`.
    2. Tiến trình tự động refresh tại Axios Interceptor trên Client thất bại.
    3. Trình bắt lỗi `catch` của Axios Interceptor tự động xóa toàn bộ thông tin xác thực (`token`, `refreshToken`, `user`) khỏi `localStorage` và chuyển hướng người dùng trực tiếp về trang `/login` để yêu cầu đăng nhập lại từ đầu.

- **Trường hợp 3 (Đăng nhập sai tài khoản hoặc mật khẩu):**
  - *Mô tả:* Người dùng nhập sai Email hoặc Mật khẩu không trùng khớp.
  - *Hành động của Hệ thống:* `AuthenticationManager` ném ra ngoại lệ `BadCredentialsException`. `GlobalExceptionHandler` của Backend bắt lỗi này và trả về HTTP Status `401 Unauthorized` đi kèm thông báo `"Bad credentials"`. Client hiển thị thông báo lỗi trực quan trên form đăng nhập cho người dùng.

- **Trường hợp 4 (Truy cập tài nguyên trái phép - 403 Forbidden):**
  - *Mô tả:* Người dùng đã đăng nhập hợp lệ nhưng cố tình truy cập vào API được bảo vệ yêu cầu quyền hạn cao hơn vai trò của họ (ví dụ: Sinh viên truy cập vào API soát vé của Check-in Staff).
  - *Hành động của Hệ thống:* Spring Security chặn yêu cầu ở tầng controller nhờ chú thích `@PreAuthorize("hasAnyRole(...)")` hoặc `@PreAuthorize("hasAuthority(...)")` và ném ra ngoại lệ `AccessDeniedException`. Backend trả về HTTP Status `403 Forbidden`. Client bắt lỗi này, chuyển hướng người dùng đến giao diện cảnh báo lỗi truy cập trái phép (`/unauthorized`).

- **Trường hợp 5 (Đăng ký trùng Email):**
  - *Mô tả:* Người dùng cố gắng đăng ký tài khoản mới bằng một Email đã được đăng ký trước đó trong hệ thống.
  - *Hành động của Hệ thống:* `AuthService.register` kiểm tra sự tồn tại của Email trong `UserRepository`. Nếu tìm thấy, ném ra ngoại lệ `RuntimeException("Email already exists")`. Backend trả về lỗi đăng ký, Client hiển thị cảnh báo đỏ trên giao diện đăng ký.

---

## 4. Ràng buộc (Constraints)

- **Cơ chế bảo vệ áp dụng:**
  - **Mật khẩu băm an toàn (BCrypt Password Hashing):** Sử dụng thuật toán băm mạnh `BCryptPasswordEncoder` để mã hóa mật khẩu trước khi lưu xuống cơ sở dữ liệu. Hệ thống tuyệt đối không lưu trữ mật khẩu dưới dạng văn bản thuần túy (plain text).
  - **Kiến trúc Stateless (Stateless JWT Session):** Thiết lập `SessionCreationPolicy.STATELESS` đảm bảo server không lưu trạng thái phiên làm việc (session state) của người dùng. Điều này tối ưu hóa khả năng mở rộng (scale) của hệ thống và loại bỏ nguy cơ tấn công chiếm quyền điều khiển phiên (Session Hijacking).
  - **Quản lý Vòng đời Refresh Token chặt chẽ:** Refresh Token được định danh ngẫu nhiên bằng chuỗi UUID v4 thay vì chứa thông tin người dùng trực tiếp để tránh rò rỉ dữ liệu. Các token này được quản lý thời gian hết hạn và hỗ trợ cơ chế thu hồi lập tức (`revoked_at`) khi người dùng bấm Đăng xuất (`logout`), vô hiệu hóa hoàn toàn khả năng sử dụng lại token cũ.
  - **Bảo vệ bằng CORS (Cross-Origin Resource Sharing):** Định cấu hình danh sách nguồn cho phép (Allowed Origins) linh hoạt trong [SecurityConfig.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/security/SecurityConfig.java) bao gồm localhost, dải IP nội bộ và các tên miền ngrok, hỗ trợ tối đa việc kiểm thử ứng dụng di động qua thiết bị thật hoặc máy ảo một cách an toàn.

- **Database Constraints:**
  - Bảng `users` định nghĩa ràng buộc `email VARCHAR(255) NOT NULL UNIQUE` đảm bảo không có hai tài khoản trùng email.
  - Bảng `refresh_tokens` định nghĩa ràng buộc `token_hash VARCHAR(255) NOT NULL UNIQUE` để tránh va chạm khóa định danh refresh token.
  - Các khóa ngoại `fk_refresh_tokens_user`, `fk_user_roles_user`, `fk_user_roles_role` đảm bảo tính toàn vẹn tham chiếu của cơ sở dữ liệu.

- **Quyền truy cập (RBAC):**
  - Định nghĩa 4 Vai trò mặc định: `STUDENT` (Sinh viên), `ORGANIZER` (Ban tổ chức), `CHECKIN_STAFF` (Nhân viên soát vé), và `ADMIN` (Quản trị viên).
  - Spring Security phân tích các vai trò này và ánh xạ chúng thành quyền hạn có tiền tố `ROLE_` (ví dụ: `ROLE_STUDENT`, `ROLE_ADMIN`).
  - Hỗ trợ thêm Quyền hạn chi tiết (Granular Permissions) tải từ bảng `permissions` để thực thi bảo mật mức độ mịn (ví dụ: `@PreAuthorize("hasAuthority('WORKSHOP_CREATE')")`).

---

## 5. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo luồng đăng ký tài khoản tự động gán vai trò mặc định là `STUDENT` và tự động liên kết hoặc tạo mới hồ sơ thông tin sinh viên (`Student` profile entity).
- [ ] AC2: Đảm bảo rằng mọi yêu cầu HTTP gửi đến API được bảo vệ (ngoại trừ các endpoint public được cấu hình tại [SecurityConfig.java](file:///Users/todanh/Downloads/UniHub/src/backend/src/main/java/vn/unihub/backend/security/SecurityConfig.java)) đều bắt buộc phải đính kèm Access Token hợp lệ, nếu không hệ thống phải trả về mã lỗi HTTP `401 Unauthorized`.
- [ ] AC3: Đảm bảo cơ chế tự động làm mới mã thông báo (Silent Token Refresh) tại Axios Interceptor trên Client hoạt động trơn tru trong suốt quá trình người dùng sử dụng ứng dụng mà không gây gián đoạn hoặc yêu cầu người dùng phải thao tác lại trên màn hình khi Access Token hết hạn.
- [ ] AC4: Hệ thống phải ngay lập tức vô hiệu hóa phiên làm việc của người dùng khi thực hiện hành động Đăng xuất (`logout`) bằng cách cập nhật trường `revoked_at` của Refresh Token tương ứng trong cơ sở dữ liệu PostgreSQL.
- [ ] AC5: Đảm bảo bảo vệ mật khẩu tuyệt đối bằng cơ chế BCrypt và ngăn chặn hoàn toàn việc rò rỉ thông tin đăng nhập thông qua các phản hồi lỗi chung (ví dụ: hiển thị lỗi chung "Bad credentials" thay vì thông báo cụ thể "Mật khẩu không đúng" hay "Tài khoản không tồn tại").
