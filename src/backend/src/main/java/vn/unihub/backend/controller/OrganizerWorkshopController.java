package vn.unihub.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.unihub.backend.dto.catalog.WorkshopRequest;
import vn.unihub.backend.dto.catalog.WorkshopResponse;
import vn.unihub.backend.dto.registration.OrganizerRegistrationSummaryResponse;
import vn.unihub.backend.dto.registration.RegistrationResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.security.CustomUserDetails;
import vn.unihub.backend.service.RegistrationService;
import vn.unihub.backend.service.WorkshopService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/organizer/workshops")
@RequiredArgsConstructor
public class OrganizerWorkshopController {
    private final WorkshopService workshopService;
    private final RegistrationService registrationService;

    @GetMapping("/events")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<List<vn.unihub.backend.entity.catalog.Event>> getEvents() {
        return ResponseEntity.ok(workshopService.getAllEvents());
    }

    @GetMapping("/rooms")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<List<vn.unihub.backend.entity.catalog.Room>> getRooms() {
        return ResponseEntity.ok(workshopService.getAllRooms());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<List<WorkshopResponse>> getAllWorkshops() {
        return ResponseEntity.ok(workshopService.getAllWorkshops());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<WorkshopResponse> getWorkshopById(@PathVariable UUID id) {
        return ResponseEntity.ok(workshopService.getWorkshopById(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_CREATE')")
    public ResponseEntity<WorkshopResponse> createWorkshop(
            @Valid @RequestBody WorkshopRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(workshopService.createWorkshop(request, userDetails.getUser()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_UPDATE')")
    public ResponseEntity<WorkshopResponse> updateWorkshop(
            @PathVariable UUID id,
            @Valid @RequestBody WorkshopRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(workshopService.updateWorkshop(id, request, userDetails.getUser()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_DELETE')")
    public ResponseEntity<Void> deleteWorkshop(@PathVariable UUID id) {
        workshopService.deleteWorkshop(id);
        return ResponseEntity.noContent().build();
    }

    // Quản lý danh sách đăng ký
    @GetMapping("/{id}/registrations")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_MANAGE')")
    public ResponseEntity<Page<RegistrationResponse>> getWorkshopRegistrations(
            @PathVariable UUID id,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(registrationService.listRegistrationsByWorkshop(id, status, page, size));
    }

    @GetMapping("/{id}/registration-summary")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_MANAGE')")
    public ResponseEntity<OrganizerRegistrationSummaryResponse> getWorkshopRegistrationSummary(@PathVariable UUID id) {
        return ResponseEntity.ok(registrationService.getWorkshopRegistrationSummary(id));
    }

    @PatchMapping("/registrations/{registrationId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER') or hasAuthority('WORKSHOP_MANAGE')")
    public ResponseEntity<RegistrationResponse> updateRegistrationStatus(
            @PathVariable UUID registrationId,
            @RequestParam String status,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        return ResponseEntity.ok(registrationService.updateRegistrationStatus(registrationId, status, userDetails.getUser()));
    }
}
