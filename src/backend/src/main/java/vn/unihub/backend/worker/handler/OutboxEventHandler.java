package vn.unihub.backend.worker.handler;

import vn.unihub.backend.entity.notification.OutboxEvent;

public interface OutboxEventHandler {
    boolean supports(String eventType);
    void handle(OutboxEvent event) throws Exception;
}
