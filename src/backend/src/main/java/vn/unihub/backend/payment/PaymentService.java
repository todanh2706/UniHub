package vn.unihub.backend.payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.circuitbreaker.CircuitBreakerService;
import vn.unihub.backend.entity.payment.Payment;
import vn.unihub.backend.entity.registration.Registration;

import java.math.BigDecimal;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final CircuitBreakerService circuitBreakerService;
    private final MockPaymentGateway mockPaymentGateway;

    /**
     * Initiate payment for a paid registration, protected by circuit breaker.
     */
    @Transactional
    public Payment initiatePayment(Registration registration) {
        Payment payment = Payment.builder()
                .registration(registration)
                .idempotencyKey("PAY-" + registration.getId())
                .amount(registration.getWorkshop().getPriceAmount())
                .currency(registration.getWorkshop().getCurrency())
                .provider("MOCK_GATEWAY")
                .status("INITIATED")
                .requestedAt(Instant.now())
                .build();

        try {
            MockPaymentGateway.PaymentGatewayResponse response = circuitBreakerService.executeWithCircuitBreaker(() ->
                    mockPaymentGateway.initiatePayment(
                            payment.getIdempotencyKey(),
                            payment.getAmount(),
                            payment.getCurrency(),
                            "Workshop: " + registration.getWorkshop().getTitle()
                    )
            );

            return switch (response.result()) {
                case SUCCEEDED -> {
                    payment.setProviderTransactionId(response.transactionId());
                    payment.setStatus("SUCCEEDED");
                    payment.setPaidAt(Instant.now());
                    yield payment;
                }
                case TIMEOUT -> {
                    payment.setStatus("TIMEOUT");
                    yield payment;
                }
                case FAILED -> {
                    payment.setStatus("FAILED");
                    yield payment;
                }
            };
        } catch (CircuitBreakerService.PaymentGatewayUnavailableException e) {
            payment.setStatus("PENDING");
            log.warn("Payment gateway unavailable (circuit breaker), payment {} set to PENDING", payment.getId());
            throw e;
        }
    }

    public String getCircuitBreakerState() {
        return circuitBreakerService.getState();
    }
}
