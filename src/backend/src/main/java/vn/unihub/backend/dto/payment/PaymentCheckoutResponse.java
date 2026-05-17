package vn.unihub.backend.dto.payment;

import java.time.Instant;
import java.util.UUID;

public record PaymentCheckoutResponse(
        UUID registrationId,
        UUID paymentId,
        String registrationStatus,
        String paymentStatus,
        String checkoutToken,
        String checkoutUrl,
        Instant expiresAt,
        Instant requestedAt
) {
}
