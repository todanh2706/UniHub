package vn.unihub.backend.dto.ai;

import java.util.UUID;

public record DocumentUploadResponse(
        UUID documentId,
        String fileName,
        long fileSize,
        String status
) {}
