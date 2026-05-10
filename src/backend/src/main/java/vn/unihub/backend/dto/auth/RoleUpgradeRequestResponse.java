package vn.unihub.backend.dto.auth;

import lombok.Builder;
import lombok.Getter;
import java.time.Instant;
import java.util.UUID;

@Getter
@Builder
public class RoleUpgradeRequestResponse {
    private UUID id;
    private UserInfo user;
    private String requestedRole;
    private String status;
    private String reason;
    private Instant createdAt;

    @Getter
    @Builder
    public static class UserInfo {
        private String fullName;
        private String email;
    }
}
