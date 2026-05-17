# Đặc tả: Hệ thống Thông báo (Notification & Outbox Architecture)

**Trạng thái:** Approved
**Thành viên phụ trách:** Nhóm Phát triển UniHub

## 1. Mô tả
Hệ thống Thông báo của UniHub chịu trách nhiệm truyền tải các thông tin cập nhật quan trọng (như xác nhận đăng ký workshop thành công, thay đổi lịch trình, mã QR tham gia) đến sinh viên một cách nhanh chóng và đáng tin cậy.

Hệ thống được thiết kế theo các nguyên lý kiến trúc tiên tiến để đảm bảo hiệu suất và độ tin cậy:
- **Mẫu Thiết kế Chiến lược (Strategy Pattern):** Hỗ trợ đa kênh thông báo (Email, In-App) và tuân thủ chặt chẽ nguyên lý Đóng/Mở (Open-Closed Principle - OCP). Các kênh thông báo độc lập thực thi cùng một giao diện `NotificationChannel`, giúp việc tích hợp thêm các kênh mới như Telegram hay SMS sau này hoàn toàn không phải thay đổi mã nguồn cốt lõi.
- **Mẫu Giao dịch Outbox (Transactional Outbox Pattern):** Đối với các kênh thông báo bên ngoài có độ trễ cao hoặc không ổn định (như Email), hệ thống không gọi trực tiếp trong tiến trình xử lý chính. Thay vào đó, dữ liệu thông báo được ghi nhận dưới dạng một sự kiện (`OutboxEvent`) lưu vào cơ sở dữ liệu PostgreSQL trong cùng một giao dịch (transaction) của nghiệp vụ chính. Một tiến trình chạy nền (`OutboxWorker`) sẽ quét định kỳ, gửi tin và cập nhật trạng thái sự kiện, đảm bảo phân phối tin cậy mức **At-Least-Once** (tối thiểu một lần) ngay cả khi ứng dụng hoặc nhà cung cấp dịch vụ gặp sự cố tạm thời.
- **Thông báo Nội ứng dụng (In-App Notifications):** Lưu trực tiếp trong cơ sở dữ liệu, cho phép người dùng truy vấn danh sách phân trang và cập nhật trạng thái "Đã đọc" trực tiếp từ giao diện Web thông qua kỹ thuật **Polling** định kỳ 30 giây được quản lý bởi thư viện **TanStack React Query**.

---

## 2. Luồng chính (Happy Path)

### Luồng Gửi Thông báo Đăng ký Workshop Thành công

1. **Client (Web PWA / Mobile App):**
   - Sinh viên đăng ký workshop thành công. Nghiệp vụ lưu đăng ký hoàn tất. Hệ thống kích hoạt gửi thông báo xác nhận.

2. **Backend API (Dispatch & Strategy):**
   -  được gọi và nhận thông tin thực thể `Registration`.
   - Spring Boot tự động tiêm danh sách toàn bộ các Bean thực thi interface . Hệ thống lặp qua từng kênh để gửi:
     - **Kênh In-App ():** Tạo trực tiếp một thực thể `Notification` chứa tiêu đề, nội dung và liên kết với tài khoản người dùng, sau đó lưu ngay vào PostgreSQL thông qua `NotificationRepository`.
     - **Kênh Email ():** Đóng gói thông tin (email sinh viên, tên, tên workshop, thời gian bắt đầu, phòng học) vào đối tượng JSON `RegistrationConfirmationPayload`. Sinh một thực thể `OutboxEvent` có kiểu sự kiện `"REGISTRATION_CONFIRMED"`, trạng thái `"PENDING"`, và lưu trực tiếp vào bảng `outbox_events`.
   - Cả hai hoạt động lưu trữ này đều chạy chung Transaction nghiệp vụ đăng ký và được commit đồng thời.

3. **Tiến trình Xử lý nền (Outbox Worker & SMTP):**
   -  kích hoạt định kỳ 5 giây một lần (cấu hình qua `@Scheduled`).
   - Đọc danh sách tối đa 50 sự kiện có trạng thái `"PENDING"` trong DB.
   - Cập nhật trạng thái sự kiện thành `"PROCESSING"` để khóa bản ghi tránh tranh chấp xử lý (Concurrency lock).
   - Duyệt qua danh sách các handler để tìm handler hỗ trợ.  bắt được sự kiện `"REGISTRATION_CONFIRMED"`:
     - Đọc thông tin Payload, sinh mã QR đính kèm trực tiếp dưới dạng hình ảnh nội tuyến (Inline attachment).
     - Gọi `EmailService.sendHtmlEmail()` để gửi HTML Email sử dụng Thymeleaf Template.
   - Gửi mail thành công, `OutboxWorker` cập nhật trạng thái sự kiện thành `"PROCESSED"` và ghi nhận mốc thời gian hoàn tất (`processedAt`).

4. **Phản hồi & Hiển thị trên Client:**
   - **Email:** Người dùng nhận được email xác nhận đăng ký đi kèm mã QR soát vé sắc nét và trực quan.
   - **In-App:** Component  trên thanh điều hướng thực hiện polling API `/notifications/unread-count` định kỳ 30 giây qua hook . Khi phát hiện có thông báo mới, biểu tượng quả chuông hiển thị huy hiệu (Badge) số lượng chưa đọc màu đỏ nổi bật. Người dùng click mở chuông sẽ xem được tiêu đề và nội dung mô tả chi tiết với hiệu ứng mượt mà điều phối bởi `framer-motion`.

---

## 3. Kịch bản lỗi (Error Scenarios)

- **Trường hợp 1 (Mail Server bị lỗi tạm thời - Outbox Retry):**
  - *Mô tả:* Máy chủ gửi email SMTP bị quá tải hoặc rớt kết nối tạm thời khi `OutboxWorker` đang chạy.
  - *Hành động của Hệ thống:* Cuộc gọi `emailService.sendHtmlEmail()` ném ra ngoại lệ. `OutboxWorker` bắt được ngoại lệ này, ghi nhận log lỗi chi tiết, đồng thời cập nhật trạng thái sự kiện trong DB thành `"FAILED"` để tránh nghẽn luồng xử lý hoặc lặp vô hạn. (Trong thực tế, có thể cấu hình số lần thử lại tối đa `retryCount` trước khi đánh dấu lỗi vĩnh viễn). Dữ liệu đăng ký workshop ban đầu của sinh viên hoàn toàn không bị ảnh hưởng hay rollback.

- **Trường hợp 2 (Đánh dấu đã đọc thông báo không thuộc sở hữu - 403 Forbidden):**
  - *Mô tả:* Một người dùng cố tình gửi mã ID thông báo của người khác lên API để đánh dấu đã đọc.
  - *Hành động của Hệ thống:* `NotificationService.markAsRead()` thực hiện kiểm tra so khớp `notification.getUser().getId()` với ID tài khoản hiện tại từ Spring Security Context. Nếu không trùng khớp, ném ngoại lệ và phản hồi lỗi HTTP Status `403 Forbidden` ("Not your notification").

- **Trường hợp 3 (Lỗi tại một Kênh thông báo cụ thể):**
  - *Mô tả:* Kênh Email gặp lỗi trong quá trình serialization hoặc ghi nhận outbox.
  - *Hành động của Hệ thống:* Vòng lặp duyệt qua các kênh tại `NotificationService` được bao bọc trong các khối `try-catch` riêng biệt cho từng kênh. Sự cố xảy ra tại kênh Email sẽ bị bắt và log lỗi tại chỗ, đảm bảo không ngăn cản kênh In-App chạy tiếp hoặc gây lỗi đổ bể giao dịch nghiệp vụ cốt lõi của sinh viên.

---

## 4. Ràng buộc (Constraints)

- **Cơ chế bảo vệ áp dụng:**
  - **Transaction Boundary:** Nghiệp vụ cốt lõi và việc lưu vết thông báo/outbox phải chạy trên cùng một ranh giới giao dịch cơ sở dữ liệu (`@Transactional`).
  - **At-Least-Once Delivery:** Đảm bảo email luôn được gửi đi ngay cả khi server bị sập giữa chừng. Trạng thái `"PROCESSING"` đóng vai trò là một khóa phân tán để tránh gửi trùng khi chạy nhiều cụm worker.

- **Database Constraints:**
  - Bảng `notifications` liên kết chặt chẽ bằng khóa ngoại `fk_notifications_user` đến bảng `users`.
  - Bảng `outbox_events` lưu lịch sử với các trạng thái rõ ràng (`PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`) làm cơ sở giám sát và đối soát dữ liệu.

---

## 5. Khả năng mở rộng cho Telegram (Telegram Extensibility Specification)

Để mở rộng hệ thống gửi thông báo qua **Telegram Bot** trong tương lai mà không cần can thiệp hay sửa đổi bất kỳ dòng mã nào trong `NotificationService` (tuân thủ **Open-Closed Principle**), lập trình viên thực hiện các bước chuẩn hóa sau:

### Bước 1: Khai báo cấu hình Telegram Bot
Thêm các biến môi trường cấu hình Token và ID nhóm/kênh Telegram vào file :
```yaml
application:
  security:
    telegram:
      bot-token: ${TELEGRAM_BOT_TOKEN:}
      chat-id: ${TELEGRAM_CHAT_ID:}
```

### Bước 2: Tạo lớp Kênh thông báo Telegram (TelegramNotificationChannel)
Tạo tệp tin mới implement interface :
```java
package vn.unihub.backend.service.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import vn.unihub.backend.entity.registration.Registration;

@Component
@RequiredArgsConstructor
@Slf4j
public class TelegramNotificationChannel implements NotificationChannel {

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${application.security.telegram.bot-token}")
    private String botToken;

    @Value("${application.security.telegram.chat-id}")
    private String chatId;

    @Override
    public void sendRegistrationConfirmation(Registration registration) {
        if (botToken == null || botToken.isBlank() || chatId == null || chatId.isBlank()) {
            log.warn("Telegram bot token or chat ID is not configured. Skipping channel.");
            return;
        }

        String textMessage = String.format(
                "🔔 *UniHub - Đăng ký thành công!*\n\n" +
                "👤 Sinh viên: *%s*\n" +
                "🎓 Workshop: *%s*\n" +
                "📅 Thời gian: *%s*\n" +
                "🏫 Phòng: *%s - %s*",
                registration.getStudent().getFullName(),
                registration.getWorkshop().getTitle(),
                registration.getWorkshop().getStartTime().toString(),
                registration.getWorkshop().getRoom().getName(),
                registration.getWorkshop().getRoom().getBuilding()
        );

        String telegramApiUrl = String.format(
                "https://api.telegram.org/bot%s/sendMessage?chat_id=%s&text=%s&parse_mode=Markdown",
                botToken, chatId, textMessage
        );

        try {
            restTemplate.getForObject(telegramApiUrl, String.class);
            log.info("Successfully sent registration confirmation to Telegram for registration: {}", registration.getId());
        } catch (Exception e) {
            log.error("Failed to send message to Telegram: {}", e.getMessage());
        }
    }
}
```

### Bước 3: Đăng ký tự động
Nhờ cơ chế Dependency Injection của Spring Framework, khi quét thành phần (Component Scanning), Spring Boot sẽ phát hiện `TelegramNotificationChannel` và tự động tiêm nó vào danh sách `List<NotificationChannel> notificationChannels` trong `NotificationService`. Khi có giao dịch đăng ký thành công, vòng lặp kênh sẽ tự động thực thi gửi thêm tin nhắn đến Telegram hoàn toàn tự động.

---

## 6. Tiêu chí chấp nhận (Acceptance Criteria)

- [ ] AC1: Đảm bảo rằng việc lưu thông báo In-App và ghi nhận sự kiện `OutboxEvent` được bao bọc hoàn toàn chung một Transaction với nghiệp vụ đăng ký chính của sinh viên tại Backend.
- [ ] AC2: Đảm bảo tiến trình nền `OutboxWorker` chạy định kỳ 5 giây, quét chính xác các sự kiện `"PENDING"`, khóa trạng thái `"PROCESSING"` thành công để gửi mail qua SMTP và chuyển trạng thái `"PROCESSED"` khi hoàn tất.
- [ ] AC3: Email gửi đi phải tích hợp thành công hình ảnh mã QR soát vé dưới dạng inline attachment hiển thị trực quan trên hòm thư của sinh viên.
- [ ] AC4: Component `NotificationBell` ở Front-end React phải thực hiện cơ chế Polling ổn định mỗi 30 giây để cập nhật huy hiệu chưa đọc mà không gây rò rỉ bộ nhớ hay gián đoạn trải nghiệm người dùng, đồng thời hỗ trợ hiệu ứng mượt mà.
- [ ] AC5: Đảm bảo tính mở rộng cao (OCP), cho phép tích hợp kênh Telegram mới chỉ bằng cách thêm lớp Component mà không được phép thay đổi tệp tin .
