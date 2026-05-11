package vn.unihub.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Service for caching generated QR code images in Redis.
 * QR code images are stored as Base64 strings with a TTL.
 * Since the QR content for a registration never changes (it's the check-in URL),
 * caching is safe and avoids regenerating the image on every request.
 */
@Service
@Slf4j
public class QrCodeCacheService {

    private static final String REDIS_KEY_PREFIX = "qr:img:";
    private static final long TTL_SECONDS = 86400; // 24 hours

    private final RedisTemplate<String, String> redisTemplate;
    private final QrCodeService qrCodeService;

    public QrCodeCacheService(RedisTemplate<String, String> redisTemplate,
                              QrCodeService qrCodeService) {
        this.redisTemplate = redisTemplate;
        this.qrCodeService = qrCodeService;
    }

    /**
     * Get a cached QR code image for a registration, or generate and cache it.
     *
     * @param registrationId the registration ID (used as cache key)
     * @param content        the content to encode in the QR code (used for generation only)
     * @return PNG image bytes
     */
    public byte[] getOrGenerateQrCode(UUID registrationId, String content) {
        String redisKey = REDIS_KEY_PREFIX + registrationId;

        // Try cache first
        String cached = redisTemplate.opsForValue().get(redisKey);
        if (cached != null) {
            log.debug("QR code cache hit for registration {}", registrationId);
            return Base64.getDecoder().decode(cached);
        }

        // Generate and cache
        log.debug("QR code cache miss for registration {}, generating...", registrationId);
        byte[] imageBytes = qrCodeService.generateQrCodeImage(content);
        String encoded = Base64.getEncoder().encodeToString(imageBytes);

        redisTemplate.opsForValue().set(redisKey, encoded, TTL_SECONDS, TimeUnit.SECONDS);

        return imageBytes;
    }
}
