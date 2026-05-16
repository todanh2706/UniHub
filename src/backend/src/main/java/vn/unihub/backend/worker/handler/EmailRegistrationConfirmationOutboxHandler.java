package vn.unihub.backend.worker.handler;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import vn.unihub.backend.dto.notification.RegistrationConfirmationPayload;
import vn.unihub.backend.entity.notification.OutboxEvent;
import vn.unihub.backend.service.EmailService;
import vn.unihub.backend.service.QrCodeCacheService;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailRegistrationConfirmationOutboxHandler implements OutboxEventHandler {

    private final EmailService emailService;
    private final QrCodeCacheService qrCodeCacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    @Override
    public boolean supports(String eventType) {
        return "REGISTRATION_CONFIRMED".equals(eventType);
    }

    @Override
    public void handle(OutboxEvent event) throws Exception {
        RegistrationConfirmationPayload payload = objectMapper.readValue(event.getPayload(), RegistrationConfirmationPayload.class);

        Map<String, Object> variables = new HashMap<>();
        variables.put("studentName", payload.getStudentName());
        variables.put("workshopTitle", payload.getWorkshopTitle());
        variables.put("startTime", payload.getStartTime());
        variables.put("roomName", payload.getRoomName());
        variables.put("buildingName", payload.getBuildingName());
        variables.put("frontendUrl", frontendUrl);

        String qrPayload = "/api/v1/checkins/qr/" + payload.getQrToken();
        byte[] qrCodeImage = qrCodeCacheService.getOrGenerateQrCode(payload.getRegistrationId(), qrPayload);
        Map<String, byte[]> inlineImages = new HashMap<>();
        inlineImages.put("qrCode", qrCodeImage);

        emailService.sendHtmlEmail(
                payload.getStudentEmail(),
                "Workshop Registration Confirmed",
                "email/registration-confirmation",
                variables,
                inlineImages
        );
        log.info("Handled email notification outbox event for registration {}", payload.getRegistrationId());
    }
}
