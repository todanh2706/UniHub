package vn.unihub.backend.dto.ai;

import java.util.UUID;

public record WorkshopDocumentResponse(
        UUID id,
        String fileName,
        Long fileSize,
        String mimeType,
        String processingStatus,
        String errorMessage
) {}
