package vn.unihub.backend.dto.registration;

import java.util.List;

public record OrganizerRegistrationListResponse(
        List<RegistrationResponse> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
}
