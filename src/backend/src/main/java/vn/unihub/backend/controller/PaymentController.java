package vn.unihub.backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import vn.unihub.backend.dto.payment.PaymentCheckoutResponse;
import vn.unihub.backend.dto.payment.PaymentStatusResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.security.CustomUserDetails;
import vn.unihub.backend.service.RegistrationService;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/registrations/{registrationId}/payment")
public class PaymentController {

    private final RegistrationService registrationService;

    public PaymentController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @PostMapping("/checkout")
    @PreAuthorize("hasRole('STUDENT')")
    public PaymentCheckoutResponse openCheckout(@PathVariable UUID registrationId,
                                                Authentication authentication) {
        return registrationService.openPaymentCheckout(currentUser(authentication), registrationId);
    }

    @PostMapping("/retry")
    @PreAuthorize("hasRole('STUDENT')")
    public PaymentCheckoutResponse retryCheckout(@PathVariable UUID registrationId,
                                                 Authentication authentication) {
        return registrationService.retryPayment(currentUser(authentication), registrationId);
    }

    @GetMapping("/status")
    @PreAuthorize("hasRole('STUDENT')")
    public PaymentStatusResponse paymentStatus(@PathVariable UUID registrationId,
                                               Authentication authentication) {
        return registrationService.getPaymentStatus(currentUser(authentication), registrationId);
    }

    private User currentUser(Authentication authentication) {
        return ((CustomUserDetails) authentication.getPrincipal()).getUser();
    }
}
