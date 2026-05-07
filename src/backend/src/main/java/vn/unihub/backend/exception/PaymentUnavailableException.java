package vn.unihub.backend.exception;

public class PaymentUnavailableException extends RuntimeException {
    private final int retryAfterSeconds;

    public PaymentUnavailableException(String message, int retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public int getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
