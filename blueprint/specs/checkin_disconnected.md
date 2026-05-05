# Đặc tả: Check-in khi mất mạng và đồng bộ lại

**Trạng thái:** Draft
**Thành viên phụ trách:** Mobile/Backend Team

## 1. Mô tả
Tính năng cho phép nhân sự tại cửa phòng sử dụng mobile app hoặc PWA để quét mã QR check-in cho sinh viên ngay cả khi khu vực đó có kết nối mạng không ổn định hoặc mất mạng[cite: 1, 3]. Dữ liệu phải được lưu tạm và tự động đồng bộ khi có kết nối trở lại[cite: 1].

## 2. Luồng chính (Happy Path)
1. **Client (Offline):** Nhân sự dùng thiết bị di động quét mã QR của sinh viên[cite: 1]. PWA ghi nhận thời gian quét và tạo một `client_event_id` (Unique ID) cho thao tác này[cite: 2]. Dữ liệu được lưu vào bộ nhớ cục bộ (Local Storage/IndexedDB).
2. **Client (Online Sync):** Khi có mạng trở lại, PWA gom nhóm các bản ghi check-in offline thành một danh sách và gọi API POST `/checkins/sync` để đẩy lên máy chủ.
3. **Middleware Auth & RBAC:** Hệ thống xác thực token của nhân sự và kiểm tra role `CHECKIN_STAFF`[cite: 2].
4. **Backend API:** 
   - Duyệt qua từng bản ghi trong danh sách được gửi lên.
   - Thêm bản ghi vào bảng `checkins` với trường `source` được đặt thành `OFFLINE_SYNC`[cite: 2].
   - Cập nhật trường `synced_at` là thời điểm máy chủ xử lý thành công[cite: 2].
5. **Phản hồi:** Backend trả về danh sách các `client_event_id` đã đồng bộ thành công để Client xóa khỏi bộ nhớ cục bộ.

## 3. Kịch bản lỗi (Error Scenarios)
- **Thiết bị đồng bộ lại nhiều lần (Client Retry):** Nếu PWA gửi lại một `client_event_id` đã từng được đồng bộ thành công trước đó, cơ sở dữ liệu sẽ dựa vào Unique Index trên `client_event_id` để bỏ qua việc tạo bản ghi mới và Backend trả về kết quả thành công cho record đó (Idempotent sync)[cite: 2].
- **Sinh viên check-in trùng lặp (Conflict):** Nếu một `registration_id` đã được check-in trước đó (bởi thiết bị khác đã đồng bộ lên server), Unique Index `registration_id` trên bảng `checkins` sẽ báo lỗi trùng lặp[cite: 2]. Server đánh dấu record này là lỗi conflict trong kết quả trả về, Client sẽ cập nhật UI báo trùng mã.
- **Mất mạng giữa chừng khi đang Sync:** Giao dịch API bị đứt gãy, Client sẽ giữ lại danh sách dữ liệu trong IndexedDB và thử đồng bộ lại vào lần kết nối tiếp theo.

## 4. Ràng buộc (Constraints)
- **Hiệu năng:** Thao tác quét QR và phản hồi trên thiết bị (Offline) phải xử lý dưới 2 giây/sinh viên[cite: 3].
- **Database Constraints:**
  - Unique Index trên cột `client_event_id` thuộc bảng `checkins` để chống thiết bị đẩy trùng dữ liệu[cite: 2].
  - Unique Index trên cột `registration_id` thuộc bảng `checkins` để đảm bảo mỗi đăng ký chỉ check-in một lần duy nhất[cite: 2].
- **Quyền truy cập (RBAC):** Chỉ user có role `CHECKIN_STAFF` mới được phép sử dụng endpoint đồng bộ[cite: 2].

## 5. Tiêu chí chấp nhận (Acceptance Criteria)
- [ ] AC1: Đảm bảo rằng khi thiết bị ngắt kết nối mạng, nhân sự vẫn có thể quét QR và ứng dụng hiển thị trạng thái đã ghi nhận (offline).
- [ ] AC2: Khi kết nối mạng được phục hồi, ứng dụng tự động đẩy dữ liệu lên server mà không bị mất mát bản ghi nào.
- [ ] AC3: Xử lý đúng lỗi trùng lặp nếu nhân sự cố tình gửi cùng một dữ liệu (cùng `client_event_id`) nhiều lần.
- [ ] AC4: Dữ liệu check-in offline khi đồng bộ lên server phải giữ đúng mốc thời gian thực tế sinh viên quét mã (`checked_in_at`), phân biệt với mốc thời gian đồng bộ (`synced_at`)[cite: 2].