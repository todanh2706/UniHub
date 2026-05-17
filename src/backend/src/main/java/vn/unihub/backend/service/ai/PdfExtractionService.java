package vn.unihub.backend.service.ai;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Path;

/**
 * Pipe Filter 1: PDF text extraction.
 * Receives a PDF file path and extracts plain text using Apache PDFBox.
 */
@Slf4j
@Service
public class PdfExtractionService {

    /**
     * Extract text from a PDF file.
     *
     * @param pdfPath absolute path to the PDF file
     * @return extracted plain text, or empty string if extraction fails
     */
    public String extract(Path filePath) {
        String fileName = filePath.getFileName().toString().toLowerCase();
        if (fileName.endsWith(".md") || fileName.endsWith(".txt")) {
            log.info("Reading text directly from markdown/text file: {}", filePath);
            try {
                String text = java.nio.file.Files.readString(filePath, java.nio.charset.StandardCharsets.UTF_8);
                return cleanText(text);
            } catch (IOException e) {
                log.error("Failed to read text from file: {}", filePath, e);
                return "";
            }
        }

        log.info("Extracting text from PDF: {}", filePath);

        try (PDDocument document = Loader.loadPDF(filePath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            if (text == null || text.isBlank()) {
                log.warn("No text extracted from PDF: {}", filePath);
                return "";
            }

            log.info("Extracted {} characters from PDF: {}", text.length(), filePath);
            return cleanText(text);
        } catch (IOException e) {
            log.error("Failed to extract text from PDF: {}", filePath, e);
            return "";
        }
    }

    /**
     * Clean extracted plain text by removing excessive whitespace, consecutive multiple newlines,
     * typical PDF garbage characters, and control characters.
     */
    private String cleanText(String rawText) {
        if (rawText == null) {
            return "";
        }

        // Normalize line endings to standard newlines
        String cleaned = rawText.replaceAll("\\r\\n", "\n")
                                .replaceAll("\\r", "\n");

        // Remove control characters (except tab and newlines) and illegal PDF artifacts
        cleaned = cleaned.replaceAll("[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]", "");

        // Remove multiple consecutive spaces/tabs
        cleaned = cleaned.replaceAll("[ \\t]+", " ");

        // Remove excessive consecutive newlines (more than 2 consecutive newlines are compressed to 2)
        cleaned = cleaned.replaceAll("\\n{3,}", "\n\n");

        return cleaned.trim();
    }
}

