package vn.unihub.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.CONFLICT)
public class SyncInProgressException extends RuntimeException {
    public SyncInProgressException(String message) {
        super(message);
    }
}
