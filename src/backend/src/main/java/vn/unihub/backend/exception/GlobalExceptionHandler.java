package vn.unihub.backend.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.HttpStatus;
import vn.unihub.backend.circuitbreaker.CircuitBreakerService;
import vn.unihub.backend.exception.IdempotencyConflictException;
import vn.unihub.backend.exception.PaymentUnavailableException;
import vn.unihub.backend.exception.RateLimitedException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("message", ex.getMessage());
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidationExceptions(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.put(error.getField(), error.getDefaultMessage()));
        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<Map<String, String>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("message", "Method not supported: " + ex.getMethod());
        error.put("error", "Method Not Allowed");
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    @ExceptionHandler(NoHandlerFoundException.class)
    public ResponseEntity<Map<String, String>> handleNoHandlerFound(NoHandlerFoundException ex) {
        Map<String, String> error = new HashMap<>();
        error.put("message", "Resource not found: " + ex.getRequestURL());
        error.put("error", "Not Found");
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(RateLimitedException.class)
    public ResponseEntity<Map<String, Object>> handleRateLimited(RateLimitedException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", "RATE_LIMITED");
        error.put("message", ex.getMessage());
        error.put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(429)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(error);
    }

    @ExceptionHandler(PaymentUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentUnavailable(PaymentUnavailableException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", "PAYMENT_UNAVAILABLE");
        error.put("message", ex.getMessage());
        error.put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(503)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(error);
    }

    @ExceptionHandler(IdempotencyConflictException.class)
    public ResponseEntity<Map<String, Object>> handleIdempotencyConflict(IdempotencyConflictException ex) {
        Map<String, Object> error = new HashMap<>();
        String errorCode = switch (ex.getConflictType()) {
            case REQUEST_IN_PROGRESS -> "REQUEST_IN_PROGRESS";
            case KEY_REUSED_WITH_DIFFERENT_REQUEST -> "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST";
        };
        error.put("error", errorCode);
        error.put("message", ex.getMessage());
        return ResponseEntity.status(409).body(error);
    }

    @ExceptionHandler(CircuitBreakerService.PaymentGatewayUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handlePaymentGatewayUnavailable(
            CircuitBreakerService.PaymentGatewayUnavailableException ex) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", "PAYMENT_UNAVAILABLE");
        error.put("message", ex.getMessage());
        error.put("retryAfterSeconds", ex.getRetryAfterSeconds());
        return ResponseEntity.status(503)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(error);
    }
}
