# Hướng dẫn Build & Chạy Mobile Check-in App (UniHub)

Tài liệu này hướng dẫn chi tiết cách thiết lập môi trường và build ứng dụng React Native (Expo) dành cho Ban Tổ Chức (Organizer/Check-in Staff) của dự án UniHub. App hỗ trợ check-in quét mã QR ngay cả khi không có mạng (Offline-first) nhờ `expo-sqlite`.

> ⚠️ **ĐẶC BIỆT LƯU Ý DÀNH CHO WINDOWS & MACOS**: App sử dụng Gradle 8.8, yêu cầu chính xác **Java 21**. Nếu sử dụng bản Java mới hơn (vd: Java 25) sẽ gặp lỗi `Unsupported class file major version 69`. Cách an toàn nhất là sử dụng JDK đi kèm sẵn trong Android Studio.

## 1. Yêu cầu hệ thống (Prerequisites)

*   **Node.js**: Phiên bản 18.x hoặc 20.x (Khuyến nghị LTS).
*   **Android Studio**: Phiên bản mới nhất (Iguana hoặc sứa Jellyfish). Phải cài đặt sẵn ít nhất 1 máy ảo (Emulator).
*   **Watchman** (Chỉ dành cho macOS): Bắt buộc cài để tránh lỗi `EMFILE: too many open files` khi bật Metro Server.
    *   Cài đặt qua Homebrew: `brew install watchman`
*   **(Windows) Git Bash / PowerShell**: Nên dùng Terminal hỗ trợ lệnh export.

## 2. Thiết lập Biến Môi Trường (Cực kỳ quan trọng)

Trước khi chạy bất kỳ lệnh build nào, bạn **BẮT BUỘC** phải trỏ `JAVA_HOME` vào thư mục `jbr` (JetBrains Runtime) của Android Studio và `ANDROID_HOME` vào thư mục SDK.

### Dành cho Windows:
Mở PowerShell hoặc Git Bash và chạy (thay `TEN_USER_CUA_BAN` bằng tên user trên máy của bạn):
```bash
export JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
export ANDROID_HOME="C:\Users\TEN_USER_CUA_BAN\AppData\Local\Android\Sdk"
```
*(Nếu cài qua biến môi trường hệ thống của Windows (Environment Variables), hãy trỏ đúng 2 đường dẫn trên).*

### Dành cho macOS:
```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="/Users/$(whoami)/Library/Android/sdk"
```

## 3. Cài đặt Dependencies

Mở Terminal, di chuyển vào thư mục dự án và cài đặt các thư viện. 
**Chú ý:** Luôn sử dụng cờ `--legacy-peer-deps` để tránh các lỗi xung đột phiên bản của React Native với Expo SDK 54.

```bash
cd src/mobile-checkin
npm install --legacy-peer-deps
```

*Lưu ý kỹ thuật:* Dự án có sử dụng một Custom Expo Plugin tự viết tên là `withCameraMaven.js` để tự động fix lỗi thiếu thư viện `com.google.android:cameraview:1.0.0` kinh điển khi build Android. Bạn không cần (và không nên) sửa tay file `android/build.gradle` vì Expo sẽ tự động sinh code.

## 4. Build và Chạy App

Đảm bảo biến môi trường `JAVA_HOME` và `ANDROID_HOME` vẫn đang hoạt động trong cửa sổ Terminal hiện tại, sau đó chạy lệnh:

```bash
npm run android
```

Lệnh này sẽ tự động:
1. Chạy `expo prebuild` để sinh ra thư mục native `android/`.
2. Khởi động Android Emulator (nếu chưa bật).
3. Dùng Gradle để compile mã nguồn Java/Kotlin và cài đặt file `.apk` vào máy ảo.
4. Bật sẵn Metro Bundler (máy chủ NodeJS đóng gói mã JavaScript).

*Nếu lần sau chạy lại mà app đã cài sẵn trên thiết bị (không bị xóa app), bạn chỉ cần chạy `npm start` để bật Metro Bundler.*

## 5. Mẹo & Gỡ Lỗi Thường Gặp

### 5.1. Màn hình Camera bị giả lập (Sàn caro, khối hộp)
Đây là môi trường ảo (Virtual Scene) của Android Studio. Để app có thể dùng Webcam thật của Laptop/PC quét mã QR:
1. Tắt máy ảo.
2. Mở Android Studio > **Device Manager** > Bấm nút **Edit** (cây bút chì) ở máy ảo của bạn.
3. Chọn **Show Advanced Settings**.
4. Kéo xuống mục **Camera**, phần **Back**, chuyển từ `VirtualScene` (hoặc `Emulated`) sang **Webcam0**.
5. Lưu lại (Finish) và bật lại máy ảo.

### 5.2. Đăng nhập
Chỉ tài khoản có Role là `ORGANIZER` hoặc `CHECKIN_STAFF` mới được phép đăng nhập.
*   **Tài khoản test:** `organizer@unihub.local`
*   **Mật khẩu:** `secret`

### 5.3. Cơ chế Offline Sync
Khi không có mạng (kiểm tra trạng thái góc dưới màn hình là Offline), toàn bộ dữ liệu quét QR sẽ được lưu tạm vào SQLite cục bộ (thông qua thư viện `expo-sqlite`). Khi có kết nối lại (trạng thái Online), app (`SyncManager.tsx`) sẽ tự động bắt lấy sự kiện mạng và gửi ngầm toàn bộ dữ liệu lên Backend, giúp quá trình soát vé không bao giờ bị gián đoạn.
