package vn.unihub.backend.dto.catalog;

import lombok.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkshopResponse {
    private UUID id;
    private String title;
    private String description;
    private UUID eventId;
    private String eventName;
    private UUID roomId;
    private String roomName;
    private Integer capacity;
    private BigDecimal priceAmount;
    private String currency;
    private String status;
    private Instant startTime;
    private Instant endTime;
    private Instant registrationOpensAt;
    private Instant registrationClosesAt;
}
