package vn.unihub.backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.dto.notification.RegistrationConfirmationPayload;
import vn.unihub.backend.entity.notification.Notification;
import vn.unihub.backend.entity.notification.OutboxEvent;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.repository.notification.NotificationRepository;
import vn.unihub.backend.repository.notification.OutboxEventRepository;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final OutboxEventRepository outboxEventRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HH:mm - dd/MM/yyyy")
            .withZone(ZoneId.of("Asia/Ho_Chi_Minh"));

    @Transactional
    public void sendRegistrationConfirmation(Registration registration) {
        if (registration.getStudent() == null || registration.getStudent().getUser() == null) {
            log.warn("Cannot send notification: Student or User is null for registration {}", registration.getId());
            return;
        }

        // 1. Create In-App Notification
        String title = "Registration Confirmed: " + registration.getWorkshop().getTitle();
        String body = "Your registration for the workshop has been confirmed. You can view your QR code in your profile.";
        
        Notification notification = Notification.builder()
                .user(registration.getStudent().getUser())
                .type("WORKSHOP_CONFIRMED")
                .title(title)
                .body(body)
                .build();
        notificationRepository.save(notification);

        // 2. Create Outbox Event for Email Delivery
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

    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<vn.unihub.backend.dto.notification.NotificationResponse> getMyNotifications(vn.unihub.backend.entity.auth.User user, int page, int size) {
        org.springframework.data.domain.Pageable pageable = org.springframework.data.domain.PageRequest.of(page, size);
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable)
                .map(n -> vn.unihub.backend.dto.notification.NotificationResponse.builder()
                        .id(n.getId())
                        .type(n.getType())
                        .title(n.getTitle())
                        .body(n.getBody())
                        .readAt(n.getReadAt())
                        .createdAt(n.getCreatedAt())
                        .build());
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(vn.unihub.backend.entity.auth.User user) {
        return notificationRepository.countByUserIdAndReadAtIsNull(user.getId());
    }

    @Transactional
    public void markAsRead(java.util.UUID notificationId, vn.unihub.backend.entity.auth.User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Notification not found"));
        
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN, "Not your notification");
        }
        
        if (notification.getReadAt() == null) {
            notification.setReadAt(Instant.now());
            notificationRepository.save(notification);
        }
    }
}
