package vn.unihub.backend.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Mock payment gateway for demo purposes.
 * Simulates success, timeout, and failure scenarios.
 */
@Slf4j
@Service
public class MockPaymentGateway {

    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);

    public enum PaymentResult {
        SUCCEEDED,
        FAILED,
        TIMEOUT
    }

    /**
     * Initiate payment. Randomly succeeds/fails with configurable failure rate.
     * After 5 consecutive failures, simulates outage (always fails) to demo circuit breaker.
     */
    public PaymentGatewayResponse initiatePayment(String idempotencyKey, BigDecimal amount,
                                                   String currency, String description) {
        int failures = consecutiveFailures.get();
        int random = ThreadLocalRandom.current().nextInt(100);

        // Simulate delayed failure: first 5 calls have 60% failure rate,
        // after 5 consecutive failures, simulate outage
        boolean shouldFail;
        if (failures >= 5) {
            // Circuit should be OPEN now - always fail to keep it open
            shouldFail = true;
        } else {
            shouldFail = random < 60; // 60% failure rate for demo
        }

        if (shouldFail) {
            consecutiveFailures.incrementAndGet();
            int current = consecutiveFailures.get();
            if (current % 2 == 0) {
                // Simulate timeout
                log.warn("Payment gateway TIMEOUT for key: {} (failure #{})", idempotencyKey, current);
                return new PaymentGatewayResponse(null, PaymentResult.TIMEOUT,
                        "Gateway timeout after 3000ms");
            } else {
                log.warn("Payment gateway FAILED for key: {} (failure #{})", idempotencyKey, current);
                return new PaymentGatewayResponse(null, PaymentResult.FAILED,
                        "Gateway internal error");
            }
        }

        consecutiveFailures.set(0);
        String transactionId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("Payment gateway SUCCEEDED for key: {} -> {}", idempotencyKey, transactionId);
        return new PaymentGatewayResponse(transactionId, PaymentResult.SUCCEEDED, "ok");
    }

    /**
     * Force the gateway to succeed (for half-open test).
     */
    public PaymentGatewayResponse forceSuccess(String idempotencyKey, BigDecimal amount) {
        consecutiveFailures.set(0);
        String transactionId = "TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        return new PaymentGatewayResponse(transactionId, PaymentResult.SUCCEEDED, "ok");
    }

    public record PaymentGatewayResponse(
            String transactionId,
            PaymentResult result,
            String message
    ) {}
}
