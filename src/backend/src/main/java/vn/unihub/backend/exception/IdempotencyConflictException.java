package vn.unihub.backend.exception;

public class IdempotencyConflictException extends RuntimeException {
    public enum ConflictType { REQUEST_IN_PROGRESS, KEY_REUSED_WITH_DIFFERENT_REQUEST }

    private final ConflictType type;

    public IdempotencyConflictException(String message, ConflictType type) {
        super(message);
        this.type = type;
    }

    public ConflictType getConflictType() {
        return type;
    }
}
