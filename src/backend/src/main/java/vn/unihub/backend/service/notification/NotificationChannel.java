package vn.unihub.backend.service.notification;

import vn.unihub.backend.entity.registration.Registration;

public interface NotificationChannel {
    void sendRegistrationConfirmation(Registration registration);
}
