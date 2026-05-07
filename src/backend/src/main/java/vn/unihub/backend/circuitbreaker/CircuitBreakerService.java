package vn.unihub.backend.circuitbreaker;

import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerConfig;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.unihub.backend.entity.audit.CircuitBreakerEvent;
import vn.unihub.backend.repository.CircuitBreakerEventRepository;

import java.time.Duration;
import java.util.function.Supplier;

@Slf4j
@Service
@RequiredArgsConstructor
public class CircuitBreakerService {

    private final CircuitBreakerEventRepository eventRepository;
    private CircuitBreaker paymentCircuitBreaker;

    @PostConstruct
    public void init() {
        CircuitBreakerConfig config = CircuitBreakerConfig.custom()
                .failureRateThreshold(50)
                .slowCallRateThreshold(100)
                .slowCallDurationThreshold(Duration.ofSeconds(3))
                .permittedNumberOfCallsInHalfOpenState(1)
                .maxWaitDurationInHalfOpenState(Duration.ofSeconds(5))
                .slidingWindowType(CircuitBreakerConfig.SlidingWindowType.COUNT_BASED)
                .slidingWindowSize(5)
                .minimumNumberOfCalls(5)
                .waitDurationInOpenState(Duration.ofSeconds(30))
                .automaticTransitionFromOpenToHalfOpenEnabled(true)
                .recordExceptions(java.net.SocketTimeoutException.class,
                        java.net.ConnectException.class,
                        RuntimeException.class)
                .ignoreExceptions(IllegalArgumentException.class)
                .build();

        CircuitBreakerRegistry registry = CircuitBreakerRegistry.of(config);
        this.paymentCircuitBreaker = registry.circuitBreaker("payment-gateway");

        // Listen to state transitions and persist to DB
        this.paymentCircuitBreaker.getEventPublisher()
                .onStateTransition(event -> {
                    log.warn("Circuit breaker {} transitioned from {} to {}",
                            event.getCircuitBreakerName(),
                            event.getStateTransition().getFromState(),
                            event.getStateTransition().getToState());

                    CircuitBreakerEvent cbEvent = CircuitBreakerEvent.builder()
                            .serviceName(event.getCircuitBreakerName())
                            .fromState(event.getStateTransition().getFromState().name())
                            .toState(event.getStateTransition().getToState().name())
                            .failureCount(paymentCircuitBreaker.getMetrics().getNumberOfFailedCalls())
                            .reason("State transition detected")
                            .build();
                    eventRepository.save(cbEvent);
                });
    }

    public <T> T executeWithCircuitBreaker(Supplier<T> supplier) {
        if (isOpen()) {
            throw new PaymentGatewayUnavailableException(
                    "Cong thanh toan dang tam thoi gian doan. Vui long thu lai sau it phut.", 30);
        }
        try {
            return paymentCircuitBreaker.executeSupplier(supplier);
        } catch (PaymentGatewayUnavailableException e) {
            throw e;
        } catch (Exception e) {
            log.error("Payment gateway call failed", e);
            throw new PaymentGatewayUnavailableException(
                    "Cong thanh toan dang tam thoi gian doan. Vui long thu lai sau it phut.", 30);
        }
    }

    public boolean isOpen() {
        return paymentCircuitBreaker.getState() == CircuitBreaker.State.OPEN;
    }

    public String getState() {
        return paymentCircuitBreaker.getState().name();
    }

    public static class PaymentGatewayUnavailableException extends RuntimeException {
        private final int retryAfterSeconds;

        public PaymentGatewayUnavailableException(String message, int retryAfterSeconds) {
            super(message);
            this.retryAfterSeconds = retryAfterSeconds;
        }

        public int getRetryAfterSeconds() {
            return retryAfterSeconds;
        }
    }
}
