package vn.unihub.backend.service.notification;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.unihub.backend.dto.notification.RegistrationConfirmationPayload;
import vn.unihub.backend.entity.notification.OutboxEvent;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.repository.notification.OutboxEventRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationChannel implements NotificationChannel {

    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Override
    public void sendRegistrationConfirmation(Registration registration) {
        try {
            RegistrationConfirmationPayload payload = RegistrationConfirmationPayload.builder()
                    .registrationId(registration.getId())
                    .studentId(registration.getStudent().getId())
                    .studentEmail(registration.getStudent().getEmail())
                    .studentName(registration.getStudent().getFullName())
                    .workshopTitle(registration.getWorkshop().getTitle())
                    .qrToken(registration.getQrToken())
                    .startTime(formatter.format(registration.getWorkshop().getStartTime()))
                    .roomName(registration.getWorkshop().getRoom().getName())
                    .buildingName(registration.getWorkshop().getRoom().getBuilding())
                    .build();

            OutboxEvent outboxEvent = OutboxEvent.builder()
                    .eventType("REGISTRATION_CONFIRMED")
                    .aggregateType("Registration")
                    .aggregateId(registration.getId().toString())
                    .payload(objectMapper.writeValueAsString(payload))
                    .status("PENDING")
                    .availableAt(Instant.now())
                    .build();
            outboxEventRepository.save(outboxEvent);

        } catch (JsonProcessingException e) {
            log.error("Failed to serialize outbox event payload for registration {}", registration.getId(), e);
            throw new RuntimeException("Failed to serialize outbox event payload", e);
        }
    }
}
