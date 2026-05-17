package vn.unihub.backend.dto.payment;

import java.math.BigDecimal;
import java.util.UUID;

public record MockProviderSessionResponse(
        UUID registrationId,
        String workshopTitle,
        BigDecimal amount,
        String currency,
        String paymentStatus,
        String checkoutToken
) {
}
