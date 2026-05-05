package vn.unihub.backend.dto.registration;

import java.util.UUID;

public record OrganizerRegistrationSummaryResponse(
        UUID workshopId,
        Integer capacity,
        long confirmedCount,
        long pendingPaymentCount,
        long activeCount,
        long remainingSeats
) {
}
