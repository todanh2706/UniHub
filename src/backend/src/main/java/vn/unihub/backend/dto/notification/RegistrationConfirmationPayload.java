package vn.unihub.backend.dto.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RegistrationConfirmationPayload {
    private UUID registrationId;
    private UUID studentId;
    private String studentEmail;
    private String studentName;
    private String workshopTitle;
    private String qrToken;
    private String startTime;
    private String roomName;
    private String buildingName;
}
