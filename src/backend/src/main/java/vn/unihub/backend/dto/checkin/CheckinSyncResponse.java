package vn.unihub.backend.dto.checkin;

import java.util.List;
import java.util.UUID;

/**
 * Response DTO for the check-in sync endpoint.
 * Contains lists of successfully synced items and items that encountered errors,
 * enabling partial success handling on the client side.
 */
public record CheckinSyncResponse(
        List<SyncedItem> synced,
        List<ErrorItem> errors
) {
    /**
     * Represents a successfully synced check-in record.
     */
    public record SyncedItem(
            String clientEventId,
            UUID checkinId,
            String status // "CREATED" or "ALREADY_SYNCED"
    ) {}

    /**
     * Represents a check-in item that failed to sync.
     */
    public record ErrorItem(
            String clientEventId,
            String errorCode, // "INVALID_QR", "REGISTRATION_CANCELLED", "ALREADY_CHECKED_IN"
            String message
    ) {}
}
