# UniHub — Hệ thống Quản lý và Số hóa Workshop Đại học

## 1. Giới thiệu

**UniHub Workshop** là nền tảng toàn diện nhằm số hóa quy trình tổ chức chuỗi sự kiện "Tuần lễ kỹ năng và nghề nghiệp" tại môi trường đại học. Hệ thống thay thế các phương thức quản lý thủ công (Google Forms, Email) bằng một nền tảng tập trung — hỗ trợ từ khâu đăng ký, thanh toán đến kiểm soát ra vào (check-in) thực tế.

Dự án tập trung giải quyết các thách thức kỹ thuật lớn: xử lý tải trọng đột biến (**High Traffic**), tranh chấp tài nguyên (**Race Condition**), và đảm bảo hoạt động liên tục trong điều kiện mạng không ổn định (**Offline-First**).

### Công nghệ sử dụng

| Tầng | Công nghệ |
|---|---|
| Backend | Java 21 · Spring Boot 4 · Maven |
| Frontend (Web) | React 19 · Vite 8 · TypeScript |
| Mobile Check-in | React Native · Expo SDK 51 |
| Database | PostgreSQL 16 · Redis 8 |
| Infrastructure | Docker · Docker Compose · Flyway |

### Tính năng chính

1. **Đăng ký và Quản lý Workshop** — Hiển thị danh sách workshop, đăng ký trực tuyến (miễn phí & có phí), tự động sinh mã QR sau khi đăng ký thành công.
2. **Check-in Offline (Mobile)** — Ứng dụng di động quét QR cho nhân sự check-in. Lưu trữ cục bộ bằng SQLite khi mất mạng, tự động đồng bộ khi có kết nối lại.
3. **Tích hợp AI Summary** — Trích xuất nội dung từ PDF giới thiệu workshop, sử dụng AI để tóm tắt thông tin trên trang chi tiết.
4. **Phân quyền RBAC** — 4 vai trò: `STUDENT`, `ORGANIZER`, `CHECKIN_STAFF`, `ADMIN`. Mỗi vai trò có giao diện và quyền truy cập riêng.
5. **Bảo vệ hệ thống** — Rate Limiting (Bucket4j + Redis), Circuit Breaker (Resilience4j), Idempotency Key cho mọi request ghi.
6. **Đồng bộ CSV** — Import dữ liệu sinh viên định kỳ từ file CSV (chạy tự động lúc 2 AM hoặc trigger thủ công từ UI).
7. **Thông báo đa kênh** — Email (Thymeleaf template) + In-App notification.

### Cấu trúc thư mục

```
UniHub/
├── src/
│   ├── backend/          # Spring Boot API (Maven, ./mvnw)
│   ├── frontend/         # React SPA (Vite, npm)
│   ├── mobile-checkin/   # React Native check-in app (Expo)
│   ├── database/         # Flyway migration SQL
│   ├── docker-compose.yml
│   └── .env.example      # Biến môi trường mẫu
├── data/                 # CSV mẫu & script generate
├── blueprint/            # Tài liệu thiết kế hệ thống
└── walkthough/           # Hướng dẫn chi tiết từng module
```

---

## 2. Hướng dẫn chạy Backend & Frontend (Web)

> Đây là cách nhanh nhất để khởi động toàn bộ hệ thống web. Chỉ cần **Docker**.

### 2.1. Yêu cầu

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (bao gồm Docker Compose)

### 2.2. Cấu hình biến môi trường

```bash
cp src/.env.example src/.env
```

Mở file `src/.env` và điền các giá trị cần thiết:

```dotenv
# --- Bắt buộc ---
JWT_SECRET=<chuỗi-bí-mật-bất-kỳ>          # VD: mysupersecretkey123456

# --- Tùy chọn (AI Summary) ---
AI_API_KEY=<OpenRouter-API-Key>             # Để trống nếu không dùng AI

# --- Có thể giữ nguyên giá trị mặc định ---
POSTGRES_DB=unihub_db
POSTGRES_USER=unihub
POSTGRES_PASSWORD=password
REDIS_PASSWORD=redispassword
MAIL_HOST=localhost                         # MailHog chạy cùng docker-compose
MAIL_PORT=1025
```

### 2.3. Khởi động toàn bộ stack

```bash
docker compose -f src/docker-compose.yml up --build -d
```

Lệnh này sẽ khởi động **5 service**:

| Service | Mô tả | Port |
|---|---|---|
| `postgres` | PostgreSQL 16 | `5432` |
| `redis` | Redis 8 Alpine | `6379` |
| `backend` | Spring Boot API | `8080` |
| `frontend` | React SPA (Vite dev server) | `3000` |
| `mailhog` | Mail server giả lập | `8025` (Web UI) · `1025` (SMTP) |

### 2.4. Kiểm tra health

```bash
# Chờ ~30 giây cho backend khởi động xong, sau đó:
curl http://localhost:8080/actuator/health
```

Khi backend healthy, **Flyway** đã tự động chạy migration tạo schema + seed dữ liệu demo.

### 2.5. Truy cập ứng dụng

| URL | Mô tả |
|---|---|
| http://localhost:3000 | 🌐 Giao diện Web chính |
| http://localhost:8080/actuator/health | 💚 Health check API |
| http://localhost:8025 | 📧 MailHog — xem email hệ thống gửi |

### 2.6. Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Sinh viên | `student1@unihub.local` | `secret` |
| Ban tổ chức | `organizer@unihub.local` | `secret` |
| Nhân sự check-in | `checkin@unihub.local` | `secret` |

### 2.7. Dừng hệ thống

```bash
docker compose -f src/docker-compose.yml down
```

Thêm flag `-v` nếu muốn xóa toàn bộ dữ liệu (volumes):

```bash
docker compose -f src/docker-compose.yml down -v
```

---

## 3. Hướng dẫn chạy Mobile Check-in App

> ⚠️ **Phần này phức tạp hơn đáng kể.** App mobile sử dụng React Native + Expo và cần build native Android. Hãy đọc kỹ từng bước.

### 3.1. Yêu cầu hệ thống

| Phần mềm | Ghi chú |
|---|---|
| **Node.js** | Phiên bản 18.x hoặc 20.x (LTS) |
| **Android Studio** | Phiên bản mới nhất (Iguana / Jellyfish trở lên) |
| **Android Emulator** | Phải tạo sẵn ít nhất 1 máy ảo (AVD) trong Android Studio |
| **Watchman** *(chỉ macOS)* | `brew install watchman` — bắt buộc để tránh lỗi `EMFILE: too many open files` |

> [!CAUTION]
> **Về phiên bản Java:** App sử dụng Gradle 8.8, yêu cầu chính xác **Java 21**. Nếu máy bạn cài Java mới hơn (VD: Java 25) sẽ gặp lỗi `Unsupported class file major version 69`. **Giải pháp an toàn nhất** là dùng JDK đi kèm sẵn trong Android Studio (JetBrains Runtime) — xem bước 3.2.

### 3.2. Cài đặt & Thiết lập Android Studio

Nếu chưa có Android Studio, tải tại: https://developer.android.com/studio

Sau khi cài xong, thực hiện các bước sau:

#### Bước 1: Cài Android SDK

1. Mở Android Studio → **Settings** (hoặc **Preferences** trên macOS).
2. Vào **Languages & Frameworks → Android SDK**.
3. Tab **SDK Platforms**: Chọn ít nhất **Android 14 (API 34)**.
4. Tab **SDK Tools**: Đảm bảo đã tick:
   - Android SDK Build-Tools
   - Android SDK Command-line Tools
   - Android Emulator
   - Android SDK Platform-Tools
5. Bấm **Apply** → **OK** để cài đặt.

#### Bước 2: Tạo máy ảo (AVD)

1. Mở **Device Manager** (biểu tượng điện thoại ở thanh bên phải).
2. Bấm **Create Device**.
3. Chọn thiết bị (VD: **Pixel 7**) → **Next**.
4. Chọn system image **API 34** (tải về nếu cần) → **Next** → **Finish**.

#### Bước 3: Cấu hình Camera cho QR scan *(tùy chọn)*

Để dùng **webcam thật** của laptop quét mã QR thay vì camera ảo:

1. Trong **Device Manager** → bấm nút **Edit** (🖊️) ở máy ảo vừa tạo.
2. Chọn **Show Advanced Settings**.
3. Kéo xuống mục **Camera** → phần **Back** → chuyển từ `VirtualScene` sang **Webcam0**.
4. Bấm **Finish** để lưu.

### 3.3. Thiết lập biến môi trường

Mở Terminal và thiết lập `JAVA_HOME` trỏ vào JDK của Android Studio, và `ANDROID_HOME` trỏ vào SDK:

**macOS:**

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

**Windows** (PowerShell hoặc Git Bash):

```bash
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
export ANDROID_HOME="C:\Users\<TÊN_USER>\AppData\Local\Android\Sdk"
```

> [!IMPORTANT]
> Các biến này chỉ có hiệu lực trong cửa sổ Terminal hiện tại. Nếu mở Terminal mới, bạn cần chạy lại lệnh `export` ở trên. Để cấu hình vĩnh viễn, hãy thêm vào file `~/.zshrc` (macOS) hoặc đặt trong **Environment Variables** của Windows.

### 3.4. Đảm bảo Backend đang chạy

App mobile cần kết nối tới Backend API. Hãy đảm bảo stack Docker đã được khởi động (xem [Mục 2](#2-hướng-dẫn-chạy-backend--frontend-web)).

```bash
# Kiểm tra backend đang healthy:
curl http://localhost:8080/actuator/health
```

### 3.5. Cài đặt Dependencies

```bash
cd src/mobile-checkin
npm install --legacy-peer-deps
```

> [!NOTE]
> Flag `--legacy-peer-deps` là **bắt buộc** để tránh lỗi xung đột phiên bản giữa React Native và Expo SDK 51.
>
> Dự án có sử dụng một Custom Expo Plugin tên `withCameraMaven.js` để tự động fix lỗi thiếu thư viện `com.google.android:cameraview:1.0.0` khi build Android. Bạn **không cần** sửa tay bất kỳ file Gradle nào.

### 3.6. Build và chạy trên Emulator

Đảm bảo biến `JAVA_HOME` và `ANDROID_HOME` vẫn hoạt động trong Terminal hiện tại, sau đó:

```bash
npm run android
```

Lệnh này sẽ tự động:

1. Chạy `expo prebuild` — sinh thư mục native `android/`.
2. Khởi động Android Emulator (nếu chưa bật).
3. Dùng Gradle compile mã nguồn và cài file `.apk` vào máy ảo.
4. Bật Metro Bundler (máy chủ NodeJS đóng gói JavaScript).

> [!TIP]
> Lần build đầu tiên có thể mất **5–10 phút** do Gradle tải dependencies. Các lần sau sẽ nhanh hơn đáng kể.
>
> Nếu app đã được cài trên emulator (chưa bị xóa), lần sau chỉ cần chạy `npm start` để bật Metro Bundler mà không cần rebuild.

### 3.7. Đăng nhập trên Mobile

Chỉ tài khoản có role `ORGANIZER` hoặc `CHECKIN_STAFF` mới được phép đăng nhập trên app mobile:

| Tài khoản | Mật khẩu |
|---|---|
| `organizer@unihub.local` | `secret` |
| `checkin@unihub.local` | `secret` |

### 3.8. Cơ chế Offline Sync

Khi mất mạng (trạng thái **Offline** hiển thị ở góc dưới màn hình), toàn bộ dữ liệu quét QR sẽ được lưu tạm vào **SQLite cục bộ** (thông qua `expo-sqlite`). Khi có kết nối lại (trạng thái **Online**), `SyncManager` sẽ tự động gửi ngầm toàn bộ dữ liệu lên Backend — quá trình soát vé **không bao giờ bị gián đoạn**.

### 3.9. Xử lý lỗi thường gặp

| Lỗi | Nguyên nhân | Cách khắc phục |
|---|---|---|
| `Unsupported class file major version 69` | Java quá mới (> 21) | Đặt `JAVA_HOME` trỏ vào JDK của Android Studio (xem mục 3.3) |
| `EMFILE: too many open files` | Thiếu Watchman (macOS) | `brew install watchman` |
| Camera hiển thị sàn caro / khối hộp | Camera ảo của Emulator | Đổi Back camera sang Webcam0 (xem mục 3.2, Bước 3) |
| `SDK location not found` | Chưa set `ANDROID_HOME` | Chạy lại lệnh `export ANDROID_HOME=...` |
| Build thất bại do peer deps | Xung đột phiên bản npm | Dùng `npm install --legacy-peer-deps` |

---

## Thành viên thực hiện

### Danh (`todanh2706`) — Kiến trúc, Frontend, Mobile & DevOps

- **Thiết kế kiến trúc hệ thống**: C4 Model (System Context, Container Diagram), High-Level Architecture, đặc tả nghiệp vụ (specs).
- **Khởi tạo dự án**: Thiết lập monorepo, cấu hình Docker Compose (PostgreSQL, Redis, Backend, Frontend, MailHog), Flyway migration, `.env`, CI/CD.
- **Database schema**: Triển khai toàn bộ schema khởi tạo (`01_init_schema.sql`), các migration bổ sung (partial unique index, seed load-test accounts, relax rate limits).
- **Backend — Auth & RBAC**: Xây dựng hệ thống xác thực (JWT, Refresh Token), phân quyền RBAC (4 roles), Spring Security config.
- **Backend — Check-in & Notification**: Viết `CheckinService`, luồng Offline Sync, `NotificationService` (Strategy pattern: Email + In-App channel), Outbox Worker pattern cho async event processing.
- **Backend — Bug fixes**: Sửa lỗi Rate Limit Filter, CSV import job, AI Summary service, Idempotency service.
- **Frontend (Web)**: Toàn bộ UI/UX — hệ thống Router, Layout theo role (Student/Organizer/Admin/Checkin), trang danh sách Workshop, chi tiết Workshop, trang Profile, Navbar, NotificationBell, Check-in Portal (quét QR trên web bằng `html5-qrcode`).
- **Mobile Check-in (React Native + Expo)**: Phát triển toàn bộ app mobile — Login, Workshop List, Attendee List, QR Scanner (`expo-camera`), Offline SQLite (`expo-sqlite`), SyncManager tự đồng bộ khi có mạng, Custom Expo Plugin (`withCameraMaven.js`).
- **Testing & Load test**: Viết k6 script test tranh chấp chỗ ngồi (`seat_contention_test.js`), script test Rate Limit (`rate_limit_test.js`).
- **Email service**: Tích hợp SMTP (MailHog dev, GMail production), Thymeleaf email template cho xác nhận đăng ký.

### Khoa (`khoa0905`) — Backend Core & Tính năng nâng cao

- **Viết file design.md**: Thiết kế hệ thống sơ bộ gồm kiến trúc tổng thể, ERD, ...
- **Registration API**: Xây dựng toàn bộ API đăng ký Workshop (`RegistrationController`, `RegistrationService`), bao gồm logic chống đăng ký trùng, kiểm tra chỗ trống, xử lý trạng thái.
- **Cơ chế bảo vệ hệ thống**: Idempotency Filter (PostgreSQL + Redis), Rate Limiting (Bucket4j + Redis, Token Bucket), Circuit Breaker (Resilience4j) cho cổng thanh toán, Mock Payment Gateway.
- **Tích hợp AI Summary**: Xây dựng pipeline AI hoàn chỉnh — PDF text extraction (Apache PDFBox), gọi OpenRouter API, lưu cache kết quả. Giao diện `AiSummaryPage` cho Organizer.
- **CSV Data Sync**: Service đồng bộ CSV (`CsvSyncService`) — `@Scheduled` job chạy lúc 2 AM, manual trigger, SHA-256 checksum chống import trùng, batch flushing, fault-tolerant error logging. Giao diện `CsvSyncPage` với polling cập nhật trạng thái.
- **QR Code Generation**: Sinh mã QR tự động sau đăng ký (ZXing), cache QR image.
- **Frontend**: Trang "Đăng ký của tôi" (`MyRegistrations`) hiển thị QR code và trạng thái.
- **Testing**: 11 unit tests cho CSV Sync (parsing, upsert, error handling, large batches), tests cho Registration Controller.
- **Tài liệu API**: Viết walkthrough chi tiết cho các tính năng T05, T07, T09, T10, T12.

---

*Dự án được thực hiện như một đồ án môn học tại Trường Đại học Khoa học Tự nhiên — ĐHQG TP.HCM.*
