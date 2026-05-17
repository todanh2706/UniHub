package vn.unihub.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.unihub.backend.dto.ai.AiSummaryResponse;
import vn.unihub.backend.dto.ai.DocumentUploadResponse;
import vn.unihub.backend.dto.ai.WorkshopDocumentResponse;
import vn.unihub.backend.service.ai.AiSummaryService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiSummaryController {

    private final AiSummaryService aiSummaryService;

    /**
     * Upload a PDF document and automatically generate an AI summary.
     */
    @PostMapping("/workshops/{workshopId}/documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<DocumentUploadResponse> uploadDocument(
            @PathVariable UUID workshopId,
            @RequestParam("file") MultipartFile file) {
        DocumentUploadResponse response = aiSummaryService.uploadAndSummarize(workshopId, file);
        return ResponseEntity.ok(response);
    }

    /**
     * List all uploaded documents for a workshop.
     */
    @GetMapping("/workshops/{workshopId}/documents")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<List<WorkshopDocumentResponse>> listDocuments(@PathVariable UUID workshopId) {
        return ResponseEntity.ok(aiSummaryService.getDocuments(workshopId));
    }

    /**
     * Get the latest AI summary for a workshop.
     * Accessible to any authenticated user (students can view on details page).
     */
    @GetMapping("/workshops/{workshopId}/summary")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<AiSummaryResponse> getSummary(@PathVariable UUID workshopId) {
        AiSummaryResponse summary = aiSummaryService.getLatestSummary(workshopId);
        if (summary == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(summary);
    }

    /**
     * Re-generate the AI summary for an existing document.
     */
    @PostMapping("/documents/{documentId}/summarize")
    @PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
    public ResponseEntity<AiSummaryResponse> regenerateSummary(@PathVariable UUID documentId) {
        AiSummaryResponse summary = aiSummaryService.regenerateSummary(documentId);
        return ResponseEntity.ok(summary);
    }
}
