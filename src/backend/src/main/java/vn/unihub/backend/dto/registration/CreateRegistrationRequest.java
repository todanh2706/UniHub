package vn.unihub.backend.dto.registration;

import java.util.UUID;

public record CreateRegistrationRequest(
        UUID workshopId
) {
}
