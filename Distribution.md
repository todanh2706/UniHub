# Phân công nhiệm vụ: Đồ án UniHub Workshop

## Bảng phân công (Task List)

| Task ID | Tên công việc                                        | Assignee |
| :------ | :--------------------------------------------------- | :------- |
| **T01** | Thiết kế Kiến trúc tổng thể & C4 Diagram             | Danh     |
| **T02** | Thiết kế Database & Dữ liệu                          | Khoa     |
| **T03** | Thiết kế Phân quyền (RBAC) & Luồng nghiệp vụ         | Danh     |
| **T04** | Thiết kế Cơ chế bảo vệ hệ thống                      | Khoa     |
| **T05** | Khởi tạo Project & Dữ liệu mẫu (Seed Data)           | Khoa     |
| **T06** | Cài đặt Quản trị Workshop & Authentication           | Danh     |
| **T07** | Cài đặt API Đăng ký & Xử lý Tranh chấp chỗ           | Khoa     |
| **T08** | Cài đặt Check-in Offline (Mobile/Web)                | Danh     |
| **T09** | Cài đặt tính năng AI Summary                         | Khoa     |
| **T10** | Cài đặt Đồng bộ dữ liệu CSV                          | Khoa     |
| **T11** | Cài đặt hệ thống Thông báo                           | Danh     |
| **T12** | Cài đặt Rate Limiting, Circuit Breaker & Idempotency | Khoa     |
| **T13** | Quay Video trình bày & Demo                          | Danh     |
| **T14** | Hoàn thiện Blueprint & Đóng gói nộp bài              | Danh     |

---

## Chi tiết công việc (Task Descriptions)

### Phần 1: Blueprint (Tài liệu thiết kế)

**T01: Thiết kế Kiến trúc tổng thể & C4 Diagram (Danh)**

- Viết Proposal xác định vấn đề, mục tiêu, rủi ro.
- Vẽ sơ đồ C4 Level 1 (System Context) và Level 2 (Container).
- Vẽ High-Level Architecture Diagram tập trung vào luồng dữ liệu, tích hợp hệ thống cũ và check-in offline.

**T02: Thiết kế Database & Dữ liệu (Khoa)**

- Lựa chọn hệ quản trị CSDL phù hợp (SQL/NoSQL/Redis cache) và giải thích lý do.
- Thiết kế schema/ERD cho các entity chính: Sinh viên, Workshop, Đăng ký, Check-in.

**T03: Thiết kế Phân quyền (RBAC) & Luồng nghiệp vụ (Danh)**

- Thiết kế mô hình RBAC cho 3 role: Sinh viên, Ban tổ chức, Nhân sự check-in.
- Viết đặc tả (specs) chi tiết cho luồng check-in mất mạng và luồng đăng ký có phí.

**T04: Thiết kế Cơ chế bảo vệ hệ thống (Khoa)**

- Lên giải pháp lý thuyết cho: Rate Limiting (chống tải đột biến 12.000 users), Circuit Breaker (xử lý cổng thanh toán lỗi), và Idempotency Key (chống trừ tiền 2 lần).

### Phần 2: Cài đặt (Implementation)

**T05: Khởi tạo Project & Dữ liệu mẫu (Khoa)**

- Setup base code cho Backend và Database (ví dụ: dùng Docker compose cho DB và Redis).
- Viết script generate file CSV giả lập và bộ dữ liệu Seed Data cho hệ thống.
- Viết file `README.md` hướng dẫn chạy project.

**T06: Cài đặt Quản trị Workshop & Authentication (Danh)**

- Cài đặt tính năng Login/Auth và phân quyền theo RBAC.
- Xây dựng UI/API cho Ban tổ chức: Tạo, sửa, hủy workshop, quản lý danh sách đăng ký.

**T07: Cài đặt API Đăng ký & Xử lý Tranh chấp chỗ (Khoa)**

- Xây dựng luồng sinh viên xem lịch và đăng ký workshop.
- Áp dụng các cơ chế lock/transaction hoặc Redis để đảm bảo không bị quá số lượng chỗ (race condition).
- Sinh mã QR sau khi đăng ký thành công.

**T08: Cài đặt Check-in Offline trên Mobile/Web (Danh)**

- Cài đặt tính năng quét mã QR cho Nhân sự.
- Xử lý local storage (hoặc IndexedDB/SQLite) để lưu tạm dữ liệu khi mất mạng và tự động đồng bộ (sync) lên server khi có mạng lại.

**T09: Cài đặt tính năng AI Summary (Khoa)**

- Xây dựng luồng upload file PDF.
- Tích hợp model AI (như Gemini) để đọc file, extract nội dung và trả về text tóm tắt cho workshop.

**T10: Cài đặt Đồng bộ dữ liệu CSV (Khoa)**

- Viết cronjob/worker đọc file CSV xuất ra hàng đêm.
- Xử lý upsert dữ liệu sinh viên, bỏ qua lỗi dòng (fault tolerance) để không chết cả tiến trình.

**T11: Cài đặt hệ thống Thông báo (Danh)**

- Tích hợp gửi email xác nhận và thông báo in-app sau khi đăng ký thành công.
- Thiết kế code theo pattern để dễ dàng mở rộng sang Telegram/Zalo sau này.

**T12: Cài đặt Rate Limiting, Circuit Breaker & Idempotency (Khoa)**

- Đưa các thiết kế ở T04 vào code thực tế.
- Chặn request bằng thuật toán (Token bucket/Sliding window) để bảo vệ API.
- Implement Idempotency key cho API thanh toán/đăng ký để an toàn khi client retry.

### Phần 3: Đóng gói & Nộp bài (Submission)

**T13: Quay Video trình bày & Demo (Danh)**

- Lên kịch bản demo hệ thống.
- Quay video màn hình (1080p, có camera) trình bày code, luồng chạy, và đặc biệt là cách hệ thống xử lý offline/chịu tải.

**T14: Hoàn thiện Blueprint & Đóng gói nộp bài (Danh)**

- Gom các file markdown vào folder `blueprint/` hoặc xuất PDF.
- Đẩy code và tài liệu lên Google Drive.
- Nộp file `.txt` chứa link Drive theo đúng định dạng `mã-nhóm_mssv1...txt`.
