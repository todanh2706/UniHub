package vn.unihub.backend.worker;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.dto.notification.RegistrationConfirmationPayload;
import vn.unihub.backend.entity.notification.OutboxEvent;
import vn.unihub.backend.repository.notification.OutboxEventRepository;
import vn.unihub.backend.service.EmailService;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OutboxWorker {

    private final OutboxEventRepository outboxEventRepository;
    private final EmailService emailService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // A configurable base URL for frontend links in emails
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

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

                if ("REGISTRATION_CONFIRMED".equals(event.getEventType())) {
                    processRegistrationConfirmation(event);
                } else {
                    log.warn("Unknown event type: {}", event.getEventType());
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

    private void processRegistrationConfirmation(OutboxEvent event) throws Exception {
        RegistrationConfirmationPayload payload = objectMapper.readValue(event.getPayload(), RegistrationConfirmationPayload.class);

        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", payload.getStudentName());
        variables.put("workshopTitle", payload.getWorkshopTitle());
        variables.put("startTime", payload.getStartTime());
        variables.put("roomName", payload.getRoomName());
        variables.put("buildingName", payload.getBuildingName());
        variables.put("frontendUrl", frontendUrl);

        emailService.sendHtmlEmail(
                payload.getStudentEmail(),
                "Workshop Registration Confirmed",
                "email/registration-confirmation",
                variables
        );
    }
}
