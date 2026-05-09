package vn.unihub.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.unihub.backend.dto.checkin.CheckinSyncResponse;
import vn.unihub.backend.dto.checkin.SyncCheckinRequest;
import vn.unihub.backend.security.CustomUserDetails;
import vn.unihub.backend.service.CheckinService;

@RestController
@RequestMapping("/api/v1/checkins")
@RequiredArgsConstructor
public class CheckinController {
    private final CheckinService checkinService;

    /**
     * Sync offline check-in records from the PWA client.
     * Accepts a batch of check-in items identified by QR tokens scanned offline.
     * Each item is processed independently for fault tolerance - if one item fails,
     * others can still succeed.
     *
     * @param request contains list of offline check-in items with qrToken and clientEventId
     * @param userDetails the authenticated check-in staff member
     * @return response with lists of successfully synced items and errors
     */
    @PostMapping("/sync")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER', 'CHECKIN_STAFF')")
    public ResponseEntity<CheckinSyncResponse> syncCheckins(
            @Valid @RequestBody SyncCheckinRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        CheckinSyncResponse response = checkinService.syncOfflineCheckins(
                request.items(),
                userDetails.getUser()
        );
        return ResponseEntity.ok(response);
    }
}
