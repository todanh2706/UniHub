package vn.unihub.backend.worker;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.entity.notification.OutboxEvent;
import vn.unihub.backend.repository.notification.OutboxEventRepository;
import vn.unihub.backend.worker.handler.OutboxEventHandler;

import java.time.Instant;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxWorker {

    private final OutboxEventRepository outboxEventRepository;
    private final List<OutboxEventHandler> handlers;

    @Scheduled(fixedDelayString = "${application.outbox.fixed-delay-ms:5000}")
    @Transactional
    public void processPendingEvents() {
        // Fetch up to 50 pending events to avoid memory issues and long transactions
        List<OutboxEvent> pendingEvents = outboxEventRepository.findPendingEvents(
                "PENDING", 
                Instant.now(), 
                org.springframework.data.domain.PageRequest.of(0, 50)
        );
        
        if (pendingEvents.isEmpty()) {
            return;
        }

        log.info("Processing {} pending outbox events", pendingEvents.size());

        for (OutboxEvent event : pendingEvents) {
            try {
                // Mark as processing to prevent concurrent processing if multiple workers exist
                event.setStatus("PROCESSING");
                outboxEventRepository.saveAndFlush(event);

                boolean handled = false;
                for (OutboxEventHandler handler : handlers) {
                    if (handler.supports(event.getEventType())) {
                        handler.handle(event);
                        handled = true;
                    }
                }

                if (!handled) {
                    log.warn("No handler found for event type: {}", event.getEventType());
                }

                event.setStatus("PROCESSED");
                event.setProcessedAt(Instant.now());
                outboxEventRepository.save(event);

            } catch (Exception e) {
                log.error("Failed to process outbox event ID: {}", event.getId(), e);
                // Depending on the error, we might want to set to FAILED or retry.
                // For simplicity, we set to FAILED to avoid infinite retry loops on bad data.
                event.setStatus("FAILED");
                outboxEventRepository.save(event);
            }
        }
    }
}
