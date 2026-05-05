# UI/UX DESIGN INSTRUCTION FOR UNIHUB: "MODERN TRUST & ENERGETIC"

## 1. Bảng màu chủ đạo (Color Palette)
- **Primary Color (Nút Đăng ký, Link, Brand):** Modern Indigo `#4F46E5` (Tạo cảm giác công nghệ, đáng tin cậy). 
  - *Hover state:* `#4338CA`
- **Secondary / Neutral (Nút Hủy, Disable):** Slate Gray `#64748B`. 
  - *Hover state:* `#475569`
  - *Disabled state:* Nền `#E2E8F0`, chữ `#94A3B8`.
- **Success / Status (Thành công, Còn chỗ):** Emerald Green `#10B981`.
- **Warning / Pending (Chờ thanh toán, Đếm ngược):** Amber `#F59E0B`.
- **Danger / Error (Hết chỗ, Lỗi Gateway):** Rose `#E11D48`.
- **Background (Nền trang):** Off-white `#F8FAFC`.
- **Surface / Cards (Nền thẻ chứa nội dung):** White `#FFFFFF` với viền mỏng `#E2E8F0`.
- **Typography Colors:** `#0F172A` (Heading chính) và `#475569` (Body text/Mô tả phụ).

## 2. Kiểu dáng (Shapes & Typography)
- **Font chữ:** `Inter` hoặc `Outfit` (Hiện đại, bo tròn nhẹ, dễ đọc số liệu).
- **Bo góc (Border Radius):**
  - Layout / Modal / Card: `12px` hoặc `16px` (Tạo cảm giác thân thiện, soft).
  - Button / Input: `8px` (Gọn gàng, chuẩn form).
  - Badge trạng thái (Tag): `9999px` (Pill shape - Bo tròn hoàn toàn).
- **Đổ bóng (Box Shadow):**
  - Card mặc định: `0 4px 6px -1px rgba(0,0,0, 0.05)` (Bóng rất nhẹ).
  - Card/Button khi Hover: `0 10px 15px -3px rgba(79,70,229, 0.15)` (Bóng nổi lên, có tone màu Primary).

## 3. Quy chuẩn các Component đặc thù (Workshop Flow)
- **Nút "Đăng ký" (Primary CTA):**
  - **Normal:** Nền `#4F46E5`, chữ Trắng, Font-weight `600`.
  - **Processing (Idempotency):** Nút mờ đi (`opacity: 0.7`), hiển thị icon Spinner quay vòng bên trái text, vô hiệu hóa click.
  - **Locked (Rate Limit 429 / Chờ Retry):** Nút chuyển màu xám `#E2E8F0`, đổi text thành "Vui lòng đợi 3s..." kèm icon 🔒.
- **Khu vực chờ thanh toán (Pending Payment):**
  - Phải có đồng hồ đếm ngược (Countdown) rõ ràng.
  - Khi thời gian còn > 3 phút: Màu chữ `#F59E0B`.
  - Khi thời gian còn < 3 phút (Sắp hết hạn): Màu chữ chuyển sang `#E11D48` và nhấp nháy nhẹ (Pulse effect).
- **Thông báo lỗi (Toast/Alert):**
  - Dùng kiểu Toast hiện ở góc trên bên phải.
  - Lỗi "Overbook" hoặc "503 Payment Gateway": Viền đỏ, nền đỏ nhạt `#FFF1F2`, icon ⚠️ màu `#E11D48`.

## 4. Phong cách Animation & Micro-interactions
- **Transitions:** Sử dụng `transition: all 0.2s ease-in-out` cho mọi hiệu ứng hover, focus.
- **Nút nhấn (Click/Tap):** Hiệu ứng lún xuống nhẹ (`transform: scale(0.97)`) để tạo phản hồi xúc giác.
- **Modal hiển thị:** Slide-up & Fade-in (`transform: translateY(20px) -> translateY(0)` và `opacity: 0 -> 1` trong 0.3s).
- **Skeleton Loading:** Khi mới vào trang chờ gọi API, không dùng màn hình trắng mà dùng các thanh xám nhạt (`#E2E8F0`) có hiệu ứng shimmer lướt qua.
