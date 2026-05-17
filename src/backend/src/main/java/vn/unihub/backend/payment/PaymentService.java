package vn.unihub.backend.payment;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.circuitbreaker.CircuitBreakerService;
import vn.unihub.backend.entity.payment.Payment;
import vn.unihub.backend.entity.registration.Registration;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import vn.unihub.backend.repository.PaymentRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    /**
     * Paid registration state machine used by the mock checkout flow.
     *
     * Registration lifecycle:
     * - PENDING_PAYMENT: registration exists, seat is held, student may pay/retry/check status/cancel.
     * - CONFIRMED: payment succeeded, registration is final.
     * - CANCELLED: student or system released the seat.
     * - EXPIRED (planned): payment window elapsed before successful confirmation.
     *
     * Payment lifecycle:
     * - INITIATED / CHECKOUT_READY: payment intent exists and can be opened in mock checkout.
     * - PENDING: provider result is unresolved (for example timeout) and must be checked before retry.
     * - SUCCEEDED: terminal success, must not be charged again.
     * - FAILED / CANCELLED / EXPIRED: terminal non-success states that may allow reopening checkout
     *   only if the registration itself is still pending.
     */
    public static final String PAYMENT_STATUS_INITIATED = "INITIATED";
    public static final String PAYMENT_STATUS_CHECKOUT_READY = "CHECKOUT_READY";
    public static final String PAYMENT_STATUS_PENDING = "PENDING";
    public static final String PAYMENT_STATUS_SUCCEEDED = "SUCCEEDED";
    public static final String PAYMENT_STATUS_FAILED = "FAILED";
    public static final String PAYMENT_STATUS_TIMEOUT = "TIMEOUT";
    public static final String PAYMENT_STATUS_CANCELLED = "CANCELLED";
    public static final String PAYMENT_STATUS_EXPIRED = "EXPIRED";

    private static final Set<String> TERMINAL_PAYMENT_STATUSES = Set.of(
            PAYMENT_STATUS_SUCCEEDED,
            PAYMENT_STATUS_FAILED,
            PAYMENT_STATUS_CANCELLED,
            PAYMENT_STATUS_EXPIRED
    );

    private static final Set<String> RETRYABLE_PAYMENT_STATUSES = Set.of(
            PAYMENT_STATUS_FAILED,
            PAYMENT_STATUS_TIMEOUT,
            PAYMENT_STATUS_CANCELLED,
            PAYMENT_STATUS_EXPIRED
    );

    private static final String MOCK_CHECKOUT_PATH_TEMPLATE = "/mock-payment/%s";

    private final CircuitBreakerService circuitBreakerService;
    private final MockPaymentGateway mockPaymentGateway;
    private final PaymentRepository paymentRepository;

    @Transactional
    public Payment createOrReusePaymentIntent(Registration registration) {
        return paymentRepository.findSinglePaymentIntentByRegistrationId(registration.getId())
                .map(existing -> {
                    if (isSuccessful(existing)) {
                        return existing;
                    }
                    if (!canReopenCheckout(existing)) {
                        throw new ResponseStatusException(
                                HttpStatus.CONFLICT,
                                "Payment is still pending confirmation. Please check status before retrying."
                        );
                    }
                    if (existing.getCheckoutToken() == null || existing.getCheckoutToken().isBlank()) {
                        existing.setCheckoutToken(generateCheckoutToken(registration));
                    }
                    existing.setStatus(PAYMENT_STATUS_CHECKOUT_READY);
                    existing.setRequestedAt(Instant.now());
                    existing.setLastErrorMessage(null);
                    return paymentRepository.save(existing);
                })
                .orElseGet(() -> paymentRepository.save(Payment.builder()
                        .registration(registration)
                        .idempotencyKey("PAY-" + registration.getId())
                        .amount(registration.getWorkshop().getPriceAmount())
                        .currency(registration.getWorkshop().getCurrency())
                        .provider("MOCK_GATEWAY")
                        .checkoutToken(generateCheckoutToken(registration))
                        .status(PAYMENT_STATUS_CHECKOUT_READY)
                        .requestedAt(Instant.now())
                        .build()));
    }

    @Transactional(readOnly = true)
    public Payment getPaymentIntent(Registration registration) {
        return paymentRepository.findSinglePaymentIntentByRegistrationId(registration.getId()).orElse(null);
    }

    @Transactional(readOnly = true)
    public Payment getPaymentIntentByCheckoutToken(String checkoutToken) {
        return paymentRepository.findByCheckoutToken(checkoutToken)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Payment session not found"));
    }

    public String buildMockCheckoutUrl(String checkoutToken) {
        return MOCK_CHECKOUT_PATH_TEMPLATE.formatted(checkoutToken);
    }

    /**
     * Execute the mock provider call for an existing payment intent.
     */
    @Transactional
    public Payment initiatePayment(Registration registration) {
        Payment payment = Payment.builder()
                .registration(registration)
                .idempotencyKey("PAY-" + registration.getId())
                .amount(registration.getWorkshop().getPriceAmount())
                .currency(registration.getWorkshop().getCurrency())
                .provider("MOCK_GATEWAY")
                .checkoutToken(generateCheckoutToken(registration))
                .status(PAYMENT_STATUS_INITIATED)
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
                    payment.setStatus(PAYMENT_STATUS_SUCCEEDED);
                    payment.setPaidAt(Instant.now());
                    yield payment;
                }
                case TIMEOUT -> {
                    payment.setStatus(PAYMENT_STATUS_TIMEOUT);
                    yield payment;
                }
                case FAILED -> {
                    payment.setStatus(PAYMENT_STATUS_FAILED);
                    yield payment;
                }
            };
        } catch (CircuitBreakerService.PaymentGatewayUnavailableException e) {
            payment.setStatus(PAYMENT_STATUS_PENDING);
            log.warn("Payment gateway unavailable (circuit breaker), payment {} set to PENDING", payment.getId());
            throw e;
        }
    }

    public String getCircuitBreakerState() {
        return circuitBreakerService.getState();
    }

    @Transactional
    public Payment reconcilePendingPayment(Payment payment) {
        if (payment != null && PAYMENT_STATUS_PENDING.equals(payment.getStatus()) && !isSuccessful(payment)) {
            payment.setStatus(PAYMENT_STATUS_TIMEOUT);
            if (payment.getLastErrorMessage() == null || payment.getLastErrorMessage().isBlank()) {
                payment.setLastErrorMessage("Pending payment verified after timeout; safe to retry");
            }
            return paymentRepository.save(payment);
        }
        return payment;
    }

    public boolean isSuccessful(Payment payment) {
        return payment != null
                && (PAYMENT_STATUS_SUCCEEDED.equals(payment.getStatus())
                || payment.getPaidAt() != null
                || (payment.getProviderTransactionId() != null && !payment.getProviderTransactionId().isBlank()));
    }

    public boolean canReopenCheckout(Payment payment) {
        return payment != null && !isSuccessful(payment) && !PAYMENT_STATUS_PENDING.equals(payment.getStatus());
    }

    public boolean isTerminalStatus(String paymentStatus) {
        return paymentStatus != null && TERMINAL_PAYMENT_STATUSES.contains(paymentStatus);
    }

    public boolean isRetryableStatus(String paymentStatus) {
        return paymentStatus != null && RETRYABLE_PAYMENT_STATUSES.contains(paymentStatus);
    }

    private String generateCheckoutToken(Registration registration) {
        return "chk_" + registration.getId().toString().replace("-", "") + "_"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }
}
