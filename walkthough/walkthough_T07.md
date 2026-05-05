# T07 Walkthrough - API Dang ky va Xu ly tranh chap cho

## Muc tieu T07

- Cung cap API cho sinh vien xem workshop, dang ky, xem/cancel dang ky va lay QR payload.
- Dam bao khong vuot qua so cho khi co nhieu request dong thoi.
- Cung cap API organizer de doc danh sach dang ky va thong ke theo workshop.

## Nhung gi da hoan thanh

## 1) API controller cho student va organizer

- Them `src/backend/src/main/java/vn/unihub/backend/controller/RegistrationController.java`.
- Student endpoints:
  - `GET /api/v1/workshops`
  - `GET /api/v1/workshops/{workshopId}`
  - `POST /api/v1/registrations`
  - `GET /api/v1/registrations/me`
  - `GET /api/v1/registrations/{registrationId}`
  - `DELETE /api/v1/registrations/{registrationId}`
- Organizer endpoints:
  - `GET /api/v1/organizer/workshops/{workshopId}/registrations`
  - `GET /api/v1/organizer/workshops/{workshopId}/registrations/summary`

## 2) Service xu ly nghiep vu va race condition

- Them `src/backend/src/main/java/vn/unihub/backend/service/RegistrationService.java`.
- Chien luoc chong tranh chap cho:
  - Khoa pessimistic row tren workshop (`findByIdForUpdate`).
  - Dem active seats trong transaction.
  - Tu choi neu workshop day.
- Rule da ap dung:
  - Chi workshop `PUBLISHED` moi duoc dang ky.
  - Chi support workshop free trong pha T07.
  - Tu choi duplicate active registration.
  - Tu choi dang ky trung gio voi workshop da active.
  - Tu choi cancel sau khi workshop bat dau.

## 3) Repository phuc vu truy van T07

- Them `StudentRepository`, `WorkshopRepository`, `RegistrationRepository`.
- Cac query chinh:
  - Lock workshop de xu ly tao dang ky an toan.
  - Dem active seats (`CONFIRMED`, va `PENDING_PAYMENT` chua het han).
  - Kiem tra duplicate active registration.
  - Kiem tra overlap lich workshop.
  - Filter danh sach dang ky theo workshop va status.

## 4) DTO response/request cho endpoint

- Them nhom DTO tai `src/backend/src/main/java/vn/unihub/backend/dto/registration/`.
- Muc tieu:
  - Tach entity khoi API contract.
  - Tra response user-facing cho registration detail.
  - Ho tro response phan trang cho organizer list.

## 5) Test coverage cho controller

- Them `src/backend/src/test/java/vn/unihub/backend/controller/RegistrationControllerTest.java`.
- Bao phu luong:
  - Student list workshop.
  - Dang ky free workshop thanh cong.
  - Tu choi paid workshop.
  - Tu choi duplicate.
  - Xem/cancel registration.
  - Organizer list/summary.
  - Chan student truy cap organizer endpoint.

## Ghi chu

- Moi endpoint trong T07 duoc mo ta chi tiet tai `walkthough/API.md`.
- Trong moi truong hien tai, chua the chay test local do JDK dang thieu Java 21 (`release version 21 not supported`).
