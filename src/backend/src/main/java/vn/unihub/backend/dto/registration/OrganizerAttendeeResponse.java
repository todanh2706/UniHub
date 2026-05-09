package vn.unihub.backend.dto.registration;

import java.util.UUID;

public record OrganizerAttendeeResponse(
        UUID id,
        String studentName,
        String studentEmail,
        String status,
        boolean isCheckedIn
) {}
