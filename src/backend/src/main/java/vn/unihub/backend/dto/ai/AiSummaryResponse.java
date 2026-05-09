package vn.unihub.backend.dto.ai;

import java.time.Instant;
import java.util.UUID;

public record AiSummaryResponse(
        UUID summaryId,
        UUID documentId,
        String model,
        String status,
        String summaryText,
        String errorMessage,
        Instant createdAt
) {}
