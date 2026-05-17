package vn.unihub.backend.dto.payment;

import java.util.UUID;

public record MockProviderResultResponse(
        UUID registrationId,
        String registrationStatus,
        String paymentStatus,
        String returnUrl
) {
}
