package vn.unihub.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.unihub.backend.dto.payment.MockProviderActionRequest;
import vn.unihub.backend.dto.payment.MockProviderResultResponse;
import vn.unihub.backend.dto.payment.MockProviderSessionResponse;
import vn.unihub.backend.service.RegistrationService;

@RestController
@RequestMapping("/api/v1/public/mock-payments")
public class MockPaymentProviderController {

    private final RegistrationService registrationService;

    public MockPaymentProviderController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping("/{checkoutToken}")
    public MockProviderSessionResponse getSession(@PathVariable String checkoutToken) {
        return registrationService.getMockProviderSession(checkoutToken);
    }

    @PostMapping("/{checkoutToken}/result")
    public MockProviderResultResponse applyOutcome(@PathVariable String checkoutToken,
                                                   @RequestBody MockProviderActionRequest request) {
        return registrationService.applyMockProviderOutcome(checkoutToken, request);
    }
}
