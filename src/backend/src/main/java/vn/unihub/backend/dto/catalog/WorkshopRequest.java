package vn.unihub.backend.dto.catalog;

import jakarta.validation.constraints.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkshopRequest {
    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    @NotNull(message = "Event ID is required")
    private UUID eventId;

    @NotNull(message = "Room ID is required")
    private UUID roomId;

    @Min(value = 1, message = "Capacity must be at least 1")
    private Integer capacity;

    @NotNull(message = "Price is required")
    @DecimalMin(value = "0.0", message = "Price cannot be negative")
    private BigDecimal priceAmount;

    @NotBlank(message = "Currency is required")
    private String currency;

    @NotNull(message = "Start time is required")
    private Instant startTime;

    @NotNull(message = "End time is required")
    private Instant endTime;

    @NotNull(message = "Registration open time is required")
    private Instant registrationOpensAt;

    @NotNull(message = "Registration close time is required")
    private Instant registrationClosesAt;

    @NotBlank(message = "Status is required")
    private String status;
}
