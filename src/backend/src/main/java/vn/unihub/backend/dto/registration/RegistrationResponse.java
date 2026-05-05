package vn.unihub.backend.dto.registration;

import java.time.Instant;
import java.util.UUID;

public record RegistrationResponse(
        UUID id,
        UUID workshopId,
        String workshopTitle,
        String status,
        String qrToken,
        String qrPayload,
        Instant createdAt,
        Instant confirmedAt,
        Instant cancelledAt,
        Instant workshopStartTime,
        Instant workshopEndTime
) {
}
