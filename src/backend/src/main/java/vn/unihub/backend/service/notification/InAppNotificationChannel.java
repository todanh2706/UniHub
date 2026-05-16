package vn.unihub.backend.service.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vn.unihub.backend.entity.notification.Notification;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.repository.notification.NotificationRepository;

@Component
@RequiredArgsConstructor
@Slf4j
public class InAppNotificationChannel implements NotificationChannel {

    private final NotificationRepository notificationRepository;

    @Override
    public void sendRegistrationConfirmation(Registration registration) {
        String title = "Registration Confirmed: " + registration.getWorkshop().getTitle();
        String body = "Your registration for the workshop has been confirmed. You can view your QR code in your profile.";
        
        Notification notification = Notification.builder()
                .user(registration.getStudent().getUser())
                .type("WORKSHOP_CONFIRMED")
                .title(title)
                .body(body)
                .build();
        notificationRepository.save(notification);
    }
}
