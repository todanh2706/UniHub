# Plan: Implement mock payment flow for Task 2

## Goal
Add a complete student-visible payment flow for paid workshop registrations using a mock provider redirect, while keeping the implementation lightweight (no real gateway integration) and hardening idempotency so timeout/retry paths do not cause double charge behavior.

## Decisions
- Payment is still **mocked**, not connected to VNPay/MoMo/etc.
- UX model: redirect-like flow to an internal **mock provider page** where the student can choose `Success`, `Fail`, or `Timeout`.
- Student flow must support: **Pay now**, **Retry payment**, **Check payment status**, and **Cancel registration**.
- Timeout handling: keep registration in `PENDING_PAYMENT`; student can later check status or retry only after the system verifies the payment is not already successful.
- No separate admin/mock-control panel for this iteration.
- Payment attempt model: **one active payment per registration**; retry reuses/reactivates the same payment intent instead of creating a new attempt row each time.
- Idempotency scope: audit and fix the current implementation for both **registration creation** and the new **payment actions** so duplicate submits and timeout recovery are safe.
- Student-facing registration data should expose basic payment info: payment status, expiry, and available actions.

## Files
- `PLAN.md`
- `src/backend/src/main/java/vn/unihub/backend/controller/RegistrationController.java`
- `src/backend/src/main/java/vn/unihub/backend/service/RegistrationService.java`
- `src/backend/src/main/java/vn/unihub/backend/payment/PaymentService.java`
- `src/backend/src/main/java/vn/unihub/backend/payment/MockPaymentGateway.java`
- `src/backend/src/main/java/vn/unihub/backend/repository/PaymentRepository.java`
- `src/backend/src/main/java/vn/unihub/backend/idempotency/IdempotencyService.java`
- `src/backend/src/main/java/vn/unihub/backend/idempotency/IdempotencyFilter.java`
- `src/backend/src/main/java/vn/unihub/backend/exception/GlobalExceptionHandler.java`
- `src/backend/src/main/java/vn/unihub/backend/entity/payment/Payment.java`
- `src/backend/src/main/java/vn/unihub/backend/dto/registration/RegistrationResponse.java`
- `src/backend/src/main/java/vn/unihub/backend/dto/payment/PaymentStatusResponse.java` *(new)*
- `src/backend/src/main/java/vn/unihub/backend/dto/payment/PaymentCheckoutResponse.java` *(new)*
- `src/backend/src/main/java/vn/unihub/backend/dto/payment/MockProviderActionRequest.java` *(new, if needed)*
- `src/backend/src/main/java/vn/unihub/backend/controller/PaymentController.java` *(new)*
- `src/backend/src/main/java/vn/unihub/backend/controller/MockPaymentProviderController.java` *(new)*
- `src/backend/src/main/resources/db/migration/V9__expand_mock_payment_flow.sql` *(new, if schema additions are needed)*
- `src/backend/src/test/java/vn/unihub/backend/controller/RegistrationControllerTest.java`
- `src/backend/src/test/java/vn/unihub/backend/controller/PaymentControllerTest.java` *(new)*
- `src/backend/src/test/java/vn/unihub/backend/service/PaymentServiceTest.java` *(new or expanded)*
- `src/frontend/src/router/index.tsx`
- `src/frontend/src/pages/student/MyRegistrations.tsx`
- `src/frontend/src/pages/student/WorkshopDetails.tsx`
- `src/frontend/src/pages/student/MockPaymentProvider.tsx` *(new)*
- `src/frontend/src/api/axios.ts`
- `src/frontend/src/components/ApiErrorNotice.tsx` *(only if integration needs small adjustments)*

## Steps
- [x] Audit the current registration + payment path and define the exact state machine for paid registrations, including `PENDING_PAYMENT`, payment success, payment fail, timeout, retry, cancel, and expiry behavior.
- [x] Review the existing idempotency implementation for registrations, document current gaps, and decide the exact request keys/response replay behavior for new payment actions.
- [x] Extend the payment domain model and persistence shape only as much as needed for a reusable mock payment intent (for example provider session/return token, last status, or expiry metadata if missing).
- [x] Add repository support to load the active payment for a registration and to validate that only one active payment intent exists per registration.
- [x] Refactor `PaymentService` so paid registration creation produces or reuses a stable payment intent instead of trying to “finish payment” immediately inside registration creation.
- [x] Add backend endpoints for student payment actions: start/open checkout, get payment status, and retry payment for a pending registration.
- [x] Add backend mock-provider endpoints/pages contract so a redirect-style checkout can return `success`, `fail`, or `timeout` outcomes back into the app.
- [x] Implement backend rules that prevent duplicate charges on retry/timeouts by re-checking the active payment intent before changing status or reopening checkout.
- [x] Update registration responses to include basic payment information needed by the student UI: payment status, payment expiry, and whether pay/retry/check actions are available.
- [x] Update the student registration UI to show payment-specific actions for `PENDING_PAYMENT` registrations instead of only a passive badge.
- [x] Add a frontend mock provider page and route that behaves like an external gateway redirect, then returns control to the app with the selected outcome.
- [x] Wire `WorkshopDetails` and `MyRegistrations` so a paid registration can start checkout, resume later from pending state, retry safely, and refresh status without duplicating the registration.
- [x] Tighten frontend mutation idempotency behavior where necessary so repeated clicks or browser retries do not generate accidental conflicting actions.
- [x] Add backend tests covering: payment intent creation/reuse, timeout handling, retry safety, status checks, registration idempotency replay, and duplicate action rejection.
- [x] Add frontend/manual verification coverage for the end-to-end flows: success, fail, timeout, retry after timeout, cancel while pending, and non-payment pages still working when payment flow is misbehaving.

## Risks
- The current registration flow initiates payment immediately; changing it to a checkout-based intent flow affects both backend semantics and student UX.
- Existing seed/demo `PENDING_PAYMENT` records may need migration compatibility handling once new payment metadata is introduced.
- The current axios interceptor generates a new `Idempotency-Key` for every mutation; some payment actions may need more deliberate key reuse to make retries safe.
- A too-simple mock provider may hide edge cases; a too-complex one may bloat scope. The chosen design intentionally optimizes for demoability, not production gateway parity.
- Existing backend tests require JDK 21, so full local verification depends on the correct toolchain.

## Blast Radius
- Backend registration and payment lifecycle.
- Idempotency behavior across student mutations.
- Student-facing registration detail and paid-workshop checkout UX.
- Demo/seed compatibility for mock payment states.