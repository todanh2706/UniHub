package vn.unihub.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.dto.checkin.CheckinSyncResponse;
import vn.unihub.backend.dto.checkin.CheckinSyncResponse.ErrorItem;
import vn.unihub.backend.dto.checkin.CheckinSyncResponse.SyncedItem;
import vn.unihub.backend.dto.checkin.SyncCheckinRequest;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.registration.Checkin;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.repository.registration.CheckinRepository;
import vn.unihub.backend.repository.registration.RegistrationRepository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CheckinService {
    private final CheckinRepository checkinRepository;
    private final RegistrationRepository registrationRepository;

    /** Registration statuses that are NOT eligible for check-in */
    private static final Set<String> INVALID_STATUSES = Set.of("CANCELLED", "EXPIRED", "CHECKED_IN", "PENDING_PAYMENT");

    /**
     * Process a batch of offline check-in records.
     * Each item is processed independently - if one fails, others still succeed
     * (fault tolerance).
     *
     * Guarantees:
     * - Idempotency via unique client_event_id: duplicate syncs are safely ignored.
     * - Unique registration_id: a registration can only be checked in once.
     * - QR token resolution: finds registration by qr_token scanned from QR code.
     *
     * @param items    list of offline check-in items from the client
     * @param operator the authenticated check-in staff member
     * @return response with lists of successfully synced items and errors
     */
    @Transactional
    public CheckinSyncResponse syncOfflineCheckins(List<SyncCheckinRequest.Item> items, User operator) {
        List<SyncedItem> synced = new ArrayList<>();
        List<ErrorItem> errors = new ArrayList<>();

        for (SyncCheckinRequest.Item item : items) {
            try {
                processItem(item, operator, synced, errors);
            } catch (Exception e) {
                log.error("[CheckinService] CRITICAL ERROR processing check-in for qrToken={}: {}",
                        item.qrToken(), e.getMessage(), e);
                errors.add(new ErrorItem(
                        item.clientEventId(),
                        "INTERNAL_ERROR",
                        "An unexpected error occurred while processing this check-in"));
            }
        }

        log.info("[CheckinService] Sync completed: {} synced, {} errors", synced.size(), errors.size());
        return new CheckinSyncResponse(synced, errors);
    }

    /**
     * Process a single check-in item with full validation and idempotency handling.
     */
    private void processItem(
            SyncCheckinRequest.Item item,
            User operator,
            List<SyncedItem> synced,
            List<ErrorItem> errors) {
        // 1. Idempotency check: skip if client_event_id already exists in DB
        Optional<Checkin> existingByClientEvent = checkinRepository.findByClientEventId(item.clientEventId());
        if (existingByClientEvent.isPresent()) {
            log.debug("[CheckinService] Duplicate clientEventId={}, returning ALREADY_SYNCED",
                    item.clientEventId());
            synced.add(new SyncedItem(
                    item.clientEventId(),
                    existingByClientEvent.get().getId(),
                    "ALREADY_SYNCED"));
            return;
        }

        // 2. Resolve registration from QR token or ID
        String rawToken = item.qrToken();
        String processedToken = rawToken;
        if (rawToken != null && rawToken.contains("/api/v1/checkins/qr/")) {
            processedToken = rawToken.substring(rawToken.lastIndexOf("/") + 1);
        }

        final String finalToken = processedToken;
        Registration registration = registrationRepository.findByQrToken(finalToken)
                .or(() -> {
                    try {
                        return registrationRepository.findById(UUID.fromString(rawToken));
                    } catch (Exception e) {
                        return Optional.empty();
                    }
                })
                .orElse(null);

        if (registration == null) {
            log.warn("[CheckinService] Invalid QR token/ID '{}' for clientEventId={}", rawToken, item.clientEventId());
            errors.add(new ErrorItem(
                    item.clientEventId(),
                    "INVALID_QR",
                    "QR code is invalid or does not match any registration"));
            return;
        }

        // 3. Validate registration status (must not be cancelled or expired)
        if (INVALID_STATUSES.contains(registration.getStatus())) {
            log.warn("[CheckinService] Registration {} has invalid status '{}' for clientEventId={}",
                    registration.getId(), registration.getStatus(), item.clientEventId());
            errors.add(new ErrorItem(
                    item.clientEventId(),
                    "REGISTRATION_" + registration.getStatus(),
                    "Registration is " + registration.getStatus().toLowerCase() + " and cannot be checked in"));
            return;
        }

        // 4. Check if this registration has already been checked in (by another
        // device/event)
        if (checkinRepository.existsByRegistrationId(registration.getId())) {
            log.debug("[CheckinService] Registration {} already checked in, skipping clientEventId={}",
                    registration.getId(), item.clientEventId());
            errors.add(new ErrorItem(
                    item.clientEventId(),
                    "ALREADY_CHECKED_IN",
                    "This registration has already been checked in"));
            return;
        }

        // 5. Create and save check-in record
        Checkin checkin = Checkin.builder()
                .registration(registration)
                .checkedInBy(operator)
                .clientEventId(item.clientEventId())
                .source("OFFLINE_SYNC")
                .checkedInAt(item.checkedInAt())
                .syncedAt(Instant.now())
                .build();

        Checkin saved = checkinRepository.save(checkin);

        // 6. Update registration status to CHECKED_IN
        String oldStatus = registration.getStatus();
        registration.setStatus(RegistrationService.STATUS_CHECKED_IN);
        registrationRepository.saveAndFlush(registration);

        log.info("[CheckinService] Status updated for registration={}: {} -> {} (clientEventId={})",
                registration.getId(), oldStatus, registration.getStatus(), item.clientEventId());

        synced.add(new SyncedItem(
                item.clientEventId(),
                saved.getId(),
                "CREATED"));
    }
}
