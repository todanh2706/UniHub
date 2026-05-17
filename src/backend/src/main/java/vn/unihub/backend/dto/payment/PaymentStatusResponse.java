package vn.unihub.backend.dto.payment;

import java.time.Instant;
import java.util.UUID;

public record PaymentStatusResponse(
        UUID registrationId,
        UUID paymentId,
        String registrationStatus,
        String paymentStatus,
        String checkoutToken,
        String checkoutUrl,
        Instant expiresAt,
        Instant requestedAt,
        Instant paidAt,
        boolean canOpenCheckout,
        boolean canRetry,
        boolean canCheckStatus
) {
}
