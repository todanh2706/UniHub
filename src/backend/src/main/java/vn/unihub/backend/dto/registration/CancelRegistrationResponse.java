package vn.unihub.backend.dto.registration;

import java.time.Instant;
import java.util.UUID;

public record CancelRegistrationResponse(
        UUID registrationId,
        String status,
        Instant cancelledAt
) {
}
