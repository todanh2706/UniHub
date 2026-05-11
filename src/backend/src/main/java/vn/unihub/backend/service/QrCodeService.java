package vn.unihub.backend.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageConfig;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Service for generating QR code images using ZXing.
 */
@Service
@Slf4j
public class QrCodeService {

    private static final int DEFAULT_WIDTH = 300;
    private static final int DEFAULT_HEIGHT = 300;
    private static final int DEFAULT_MARGIN = 2;

    /**
     * Generate a QR code PNG image as a byte array.
     *
     * @param content the content to encode in the QR code
     * @return PNG image bytes
     * @throws IllegalArgumentException if content is null or blank
     * @throws RuntimeException         if generation fails
     */
    public byte[] generateQrCodeImage(String content) {
        return generateQrCodeImage(content, DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    /**
     * Generate a QR code PNG image as a byte array with custom dimensions.
     *
     * @param content the content to encode in the QR code
     * @param width   image width in pixels
     * @param height  image height in pixels
     * @return PNG image bytes
     * @throws IllegalArgumentException if content is null or blank
     * @throws RuntimeException         if generation fails
     */
    public byte[] generateQrCodeImage(String content, int width, int height) {
        if (content == null || content.isBlank()) {
            throw new IllegalArgumentException("QR code content must not be null or blank");
        }

        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();

            java.util.Map<com.google.zxing.EncodeHintType, Object> encodeHints = new java.util.HashMap<>();
            encodeHints.put(com.google.zxing.EncodeHintType.ERROR_CORRECTION, ErrorCorrectionLevel.M);
            encodeHints.put(com.google.zxing.EncodeHintType.MARGIN, DEFAULT_MARGIN);
            encodeHints.put(com.google.zxing.EncodeHintType.CHARACTER_SET, StandardCharsets.UTF_8.name());

            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height, encodeHints);

            BufferedImage bufferedImage = MatrixToImageWriter.toBufferedImage(bitMatrix, new MatrixToImageConfig(
                    MatrixToImageConfig.BLACK, MatrixToImageConfig.WHITE));

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(bufferedImage, "PNG", baos);

            byte[] result = baos.toByteArray();
            log.debug("Generated QR code image for content length={}, size={} bytes", content.length(), result.length);
            return result;
        } catch (WriterException e) {
            log.error("Failed to encode QR code content", e);
            throw new RuntimeException("Failed to generate QR code image", e);
        } catch (IOException e) {
            log.error("Failed to write QR code PNG image", e);
            throw new RuntimeException("Failed to generate QR code image", e);
        }
    }
}
