package vn.unihub.backend.dto.checkin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/**
 * Request DTO for syncing offline check-in records.
 * Contains a list of individual check-in items captured on the device.
 */
public record SyncCheckinRequest(
        @NotEmpty(message = "Items list must not be empty")
        @Valid
        List<Item> items
) {
    /**
     * Represents a single offline check-in event from the client device.
     * The client sends qrToken (scanned from QR code) rather than registrationId,
     * because the device may not have access to registration data while offline.
     */
    public record Item(
            @NotBlank(message = "QR token must not be blank")
            String qrToken,

            @NotBlank(message = "Client event ID must not be blank")
            String clientEventId,

            @NotNull(message = "Checked-in timestamp must not be null")
            Instant checkedInAt
    ) {}
}
