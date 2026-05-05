package vn.unihub.backend.dto.registration;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WorkshopDetailResponse(
        UUID id,
        String title,
        String description,
        String status,
        Instant startTime,
        Instant endTime,
        Instant registrationOpensAt,
        Instant registrationClosesAt,
        Integer capacity,
        long activeSeats,
        long remainingSeats,
        boolean registrable,
        BigDecimal priceAmount,
        String currency,
        UUID roomId,
        String roomName,
        UUID eventId,
        String eventName
) {
}
