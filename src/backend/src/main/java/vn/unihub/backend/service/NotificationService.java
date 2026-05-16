package vn.unihub.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.entity.notification.Notification;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.repository.notification.NotificationRepository;
import vn.unihub.backend.service.notification.NotificationChannel;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final List<NotificationChannel> notificationChannels;

    @Transactional
    public void sendRegistrationConfirmation(Registration registration) {
        if (registration.getStudent() == null || registration.getStudent().getUser() == null) {
            log.warn("Cannot send notification: Student or User is null for registration {}", registration.getId());
            return;
        }

        // Delegate to all configured notification channels (In-App, Email, etc.)
        for (NotificationChannel channel : notificationChannels) {
            try {
                channel.sendRegistrationConfirmation(registration);
            } catch (Exception e) {
                log.error("Error sending registration confirmation through channel {}: {}", channel.getClass().getSimpleName(), e.getMessage(), e);
            }
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
