package vn.unihub.backend.dto.registration;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WorkshopListItemResponse(
        UUID id,
        String title,
        String description,
        Instant startTime,
        Instant endTime,
        String status,
        BigDecimal priceAmount,
        String currency,
        Integer capacity,
        long activeSeats,
        long remainingSeats,
        boolean registrable,
        Instant registrationOpensAt,
        Instant registrationClosesAt
) {
}
