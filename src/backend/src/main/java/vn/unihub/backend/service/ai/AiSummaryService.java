package vn.unihub.backend.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.unihub.backend.config.AiProperties;
import vn.unihub.backend.dto.ai.AiSummaryResponse;
import vn.unihub.backend.dto.ai.DocumentUploadResponse;
import vn.unihub.backend.entity.ai.AiSummary;
import vn.unihub.backend.entity.ai.WorkshopDocument;
import vn.unihub.backend.entity.catalog.Workshop;
import vn.unihub.backend.repository.ai.AiSummaryRepository;
import vn.unihub.backend.repository.ai.WorkshopDocumentRepository;
import vn.unihub.backend.repository.catalog.WorkshopRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Orchestrator for the AI Summary pipe & filter pipeline.
 * <p>
 * Pipeline flow:
 * <pre>
 *   Upload PDF → Save file → Create WorkshopDocument →
 *   PdfExtractionService (extract text) →
 *   OpenRouterAiService (summarize) →
 *   Create AiSummary → Return response
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiSummaryService {

    private final WorkshopDocumentRepository documentRepository;
    private final AiSummaryRepository summaryRepository;
    private final WorkshopRepository workshopRepository;
    private final PdfExtractionService pdfExtractionService;
    private final OpenRouterAiService openRouterAiService;
    private final AiProperties aiProperties;

    /**
     * Upload a PDF document and run the full pipeline:
     * save file → extract text → generate AI summary → persist.
     */
    @Transactional
    public DocumentUploadResponse uploadAndSummarize(UUID workshopId, MultipartFile file) {
        // Validate workshop exists
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new IllegalArgumentException("Workshop not found: " + workshopId));

        // Validate file is PDF
        String contentType = file.getContentType();
        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null) {
            originalFilename = "unnamed.pdf";
        }
        if (contentType == null || !contentType.equalsIgnoreCase("application/pdf")) {
            // Fallback: check extension
            if (!originalFilename.toLowerCase().endsWith(".pdf")) {
                throw new IllegalArgumentException("Only PDF files are accepted. Got: " + contentType);
            }
        }

        // --- Stage 1: Save file to disk ---
        Path docsDir = Path.of(aiProperties.getDocsDir(), workshopId.toString());
        try {
            Files.createDirectories(docsDir);
        } catch (IOException e) {
            log.error("Failed to create document directory: {}", docsDir, e);
            throw new RuntimeException("Cannot create storage directory", e);
        }

        UUID documentId = UUID.randomUUID();
        String storageFilename = documentId + ".pdf";
        Path filePath = docsDir.resolve(storageFilename);

        try {
            file.transferTo(filePath.toFile());
        } catch (IOException e) {
            log.error("Failed to save uploaded file: {}", originalFilename, e);
            throw new RuntimeException("Failed to save uploaded file", e);
        }

        // --- Stage 2: Create WorkshopDocument record ---
        WorkshopDocument document = WorkshopDocument.builder()
                .id(documentId)
                .workshop(workshop)
                .fileUrl(filePath.toAbsolutePath().toString())
                .fileName(originalFilename)
                .mimeType("application/pdf")
                .fileSize(file.getSize())
                .processingStatus("EXTRACTING")
                .build();
        document = documentRepository.save(document);

        // --- Stage 3: Extract text (Pipe Filter 1) ---
        String extractedText;
        try {
            extractedText = pdfExtractionService.extract(filePath);
        } catch (Exception e) {
            log.error("PDF extraction failed for document {}", documentId, e);
            document.setProcessingStatus("EXTRACTION_FAILED");
            document.setErrorMessage(e.getMessage());
            documentRepository.save(document);
            return new DocumentUploadResponse(documentId, originalFilename, file.getSize(), "EXTRACTION_FAILED");
        }

        document.setExtractedText(extractedText);
        document.setProcessingStatus("EXTRACTED");
        documentRepository.save(document);

        if (extractedText.isBlank()) {
            document.setProcessingStatus("NO_TEXT");
            documentRepository.save(document);
            return new DocumentUploadResponse(documentId, originalFilename, file.getSize(), "NO_TEXT");
        }

        // --- Stage 4: Generate summary (Pipe Filter 2) ---
        document.setProcessingStatus("SUMMARIZING");
        documentRepository.save(document);

        String summaryText = openRouterAiService.summarize(extractedText);

        AiSummary summary;
        if (summaryText.startsWith("ERROR:")) {
            // Summarization failed
            document.setProcessingStatus("SUMMARY_FAILED");
            document.setErrorMessage(summaryText);
            documentRepository.save(document);

            summary = AiSummary.builder()
                    .document(document)
                    .model(aiProperties.getModel())
                    .status("FAILED")
                    .errorMessage(summaryText)
                    .build();
        } else {
            // Success
            document.setProcessingStatus("COMPLETED");
            documentRepository.save(document);

            summary = AiSummary.builder()
                    .document(document)
                    .model(aiProperties.getModel())
                    .status("COMPLETED")
                    .summaryText(summaryText)
                    .build();
        }

        summaryRepository.save(summary);

        log.info("AI Summary pipeline complete for document {}: status={}", documentId, summary.getStatus());
        return new DocumentUploadResponse(documentId, originalFilename, file.getSize(), document.getProcessingStatus());
    }

    /**
     * Re-generate summary for an existing document.
     */
    @Transactional
    public AiSummaryResponse regenerateSummary(UUID documentId) {
        WorkshopDocument document = documentRepository.findById(documentId)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + documentId));

        String extractedText = document.getExtractedText();
        if (extractedText == null || extractedText.isBlank()) {
            throw new IllegalArgumentException("Document has no extracted text to summarize");
        }

        String summaryText = openRouterAiService.summarize(extractedText);

        AiSummary summary;
        if (summaryText.startsWith("ERROR:")) {
            summary = AiSummary.builder()
                    .document(document)
                    .model(aiProperties.getModel())
                    .status("FAILED")
                    .errorMessage(summaryText)
                    .build();
        } else {
            summary = AiSummary.builder()
                    .document(document)
                    .model(aiProperties.getModel())
                    .status("COMPLETED")
                    .summaryText(summaryText)
                    .build();
        }
        summary = summaryRepository.save(summary);

        return toSummaryResponse(summary);
    }

    /**
     * Get documents for a workshop.
     */
    public List<WorkshopDocument> getDocuments(UUID workshopId) {
        return documentRepository.findByWorkshopId(workshopId);
    }

    /**
     * Get the latest summary for a workshop (via its most recent document).
     */
    public AiSummaryResponse getLatestSummary(UUID workshopId) {
        List<WorkshopDocument> documents = documentRepository.findByWorkshopId(workshopId);
        if (documents.isEmpty()) {
            return null;
        }
        WorkshopDocument latest = documents.get(documents.size() - 1);
        var summaryOpt = summaryRepository.findTopByDocumentIdOrderByCreatedAtDesc(latest.getId());
        return summaryOpt.map(this::toSummaryResponse).orElse(null);
    }

    private AiSummaryResponse toSummaryResponse(AiSummary s) {
        return new AiSummaryResponse(
                s.getId(),
                s.getDocument().getId(),
                s.getModel(),
                s.getStatus(),
                s.getSummaryText(),
                s.getErrorMessage(),
                s.getCreatedAt()
        );
    }
}
