package vn.unihub.backend.controller;

import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.unihub.backend.dto.registration.CancelRegistrationResponse;
import vn.unihub.backend.dto.registration.CreateRegistrationRequest;
import vn.unihub.backend.dto.registration.OrganizerRegistrationListResponse;
import vn.unihub.backend.dto.registration.OrganizerRegistrationSummaryResponse;
import vn.unihub.backend.dto.registration.RegistrationResponse;
import vn.unihub.backend.dto.registration.WorkshopDetailResponse;
import vn.unihub.backend.dto.registration.WorkshopListItemResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.security.CustomUserDetails;
import vn.unihub.backend.service.RegistrationService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class RegistrationController {
    private final RegistrationService registrationService;

    public RegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping("/workshops")
    @PreAuthorize("isAuthenticated()")
    public List<WorkshopListItemResponse> listWorkshops() {
        return registrationService.listPublishedWorkshops();
    }

    @GetMapping("/workshops/{workshopId}")
    public WorkshopDetailResponse workshopDetail(@PathVariable UUID workshopId) {
        return registrationService.getWorkshopDetail(workshopId);
    }

    @PostMapping("/registrations")
    @PreAuthorize("hasRole('STUDENT')")
    public RegistrationResponse createRegistration(
            @RequestBody CreateRegistrationRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            Authentication authentication) {
        User user = currentUser(authentication);
        return registrationService.createRegistration(user, request.workshopId(), idempotencyKey);
    }

    @GetMapping("/registrations/me")
    @PreAuthorize("hasRole('STUDENT')")
    public List<RegistrationResponse> myRegistrations(Authentication authentication) {
        User user = currentUser(authentication);
        return registrationService.listMyRegistrations(user);
    }

    @GetMapping("/registrations/{registrationId}")
    @PreAuthorize("hasRole('STUDENT')")
    public RegistrationResponse registrationDetail(@PathVariable UUID registrationId, Authentication authentication) {
        User user = currentUser(authentication);
        return registrationService.getMyRegistrationDetail(user, registrationId);
    }

    @DeleteMapping("/registrations/{registrationId}")
    @PreAuthorize("hasRole('STUDENT')")
    public CancelRegistrationResponse cancelRegistration(@PathVariable UUID registrationId, Authentication authentication) {
        User user = currentUser(authentication);
        return registrationService.cancelMyRegistration(user, registrationId);
    }

    /**
     * Get a QR code image for a registration using its secret qrToken.
     * This endpoint is public to allow <img> tags in the frontend to work
     * without needing to send an Authorization header.
     *
     * @param qrToken the secret QR token
     * @return PNG image of the QR code
     */
    @GetMapping("/public/registrations/qr/{qrToken}")
    public ResponseEntity<byte[]> getQrCodeImageByToken(@PathVariable String qrToken) {
        byte[] imageBytes = registrationService.getQrCodeImageByToken(qrToken);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Cache-Control", "public, max-age=86400")
                .body(imageBytes);
    }

    /**
     * Get a QR code image for a registration.
     * This method requires authentication and is kept for backward compatibility
     * or for secure downloads.
     *
     * @param registrationId the registration ID
     * @return PNG image of the QR code
     */
    @GetMapping("/registrations/{registrationId}/qr-code")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> getQrCodeImage(@PathVariable UUID registrationId) {
        byte[] imageBytes = registrationService.getQrCodeImage(registrationId);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header("Cache-Control", "public, max-age=86400")
                .body(imageBytes);
    }

    private User currentUser(Authentication authentication) {
        return ((CustomUserDetails) authentication.getPrincipal()).getUser();
    }
}
