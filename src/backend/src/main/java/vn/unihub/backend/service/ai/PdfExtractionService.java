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
    public String extract(Path pdfPath) {
        log.info("Extracting text from PDF: {}", pdfPath);

        try (PDDocument document = Loader.loadPDF(pdfPath.toFile())) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);

            if (text == null || text.isBlank()) {
                log.warn("No text extracted from PDF: {}", pdfPath);
                return "";
            }

            log.info("Extracted {} characters from PDF: {}", text.length(), pdfPath);
            return text.trim();
        } catch (IOException e) {
            log.error("Failed to extract text from PDF: {}", pdfPath, e);
            return "";
        }
    }
}
