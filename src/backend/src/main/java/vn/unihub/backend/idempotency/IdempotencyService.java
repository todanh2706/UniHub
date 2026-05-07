package vn.unihub.backend.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.payment.IdempotencyKey;
import vn.unihub.backend.exception.IdempotencyConflictException;
import vn.unihub.backend.repository.IdempotencyKeyRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class IdempotencyService {

    private final IdempotencyKeyRepository repository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    private static final String REDIS_PREFIX = "idem:";
    private static final long TTL_SECONDS = 3600; // 1 hour

    /**
     * Reserve an idempotency key for a request.
     * Throws IdempotencyConflictException if key already exists or request is in progress.
     */
    @Transactional
    public void reserve(String key, User user, String endpoint, String requestBody) {
        String requestHash = hashBody(requestBody);

        // Check Redis cache first
        String cached = redisTemplate.opsForValue().get(REDIS_PREFIX + key);
        if (cached != null) {
            handleExistingKey(key, requestHash, cached);
        }

        // Check PostgreSQL
        var existing = repository.findByKey(key);
        if (existing.isPresent()) {
            IdempotencyKey existingKey = existing.get();
            if (existingKey.getRequestHash().equals(requestHash)) {
                if ("COMPLETED".equals(existingKey.getResponseBody())) {
                    // Will be replayed by filter
                    return;
                }
                throw new IdempotencyConflictException(
                        "Yeu cau truoc do voi Idempotency-Key nay van dang duoc xu ly. Vui long thu lai sau.",
                        IdempotencyConflictException.ConflictType.REQUEST_IN_PROGRESS
                );
            } else {
                throw new IdempotencyConflictException(
                        "Idempotency-Key nay da duoc dung cho mot request khac.",
                        IdempotencyConflictException.ConflictType.KEY_REUSED_WITH_DIFFERENT_REQUEST
                );
            }
        }

        // Reserve in PostgreSQL
        IdempotencyKey idemKey = IdempotencyKey.builder()
                .key(key)
                .user(user)
                .endpoint(endpoint)
                .requestHash(requestHash)
                .responseBody("IN_PROGRESS")
                .statusCode(202)
                .expiresAt(Instant.now().plusSeconds(TTL_SECONDS))
                .build();
        repository.save(idemKey);

        // Reserve in Redis
        redisTemplate.opsForValue().set(REDIS_PREFIX + key, "IN_PROGRESS", TTL_SECONDS, TimeUnit.SECONDS);
    }

    /**
     * Mark an idempotency key as completed with the response.
     */
    @Transactional
    public void complete(String key, Object responseBody, int statusCode) {
        try {
            String responseJson = objectMapper.writeValueAsString(responseBody);

            var existing = repository.findByKey(key);
            if (existing.isPresent()) {
                IdempotencyKey idemKey = existing.get();
                idemKey.setResponseBody(responseJson);
                idemKey.setStatusCode(statusCode);
                repository.save(idemKey);
            }

            // Update Redis cache
            redisTemplate.opsForValue().set(REDIS_PREFIX + key, responseJson, TTL_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            log.error("Failed to complete idempotency key: {}", key, e);
        }
    }

    /**
     * Mark an idempotency key as failed.
     */
    @Transactional
    public void fail(String key, Object responseBody, int statusCode) {
        complete(key, responseBody, statusCode);
    }

    /**
     * Get a previously completed response.
     */
    public String getCachedResponse(String key) {
        return redisTemplate.opsForValue().get(REDIS_PREFIX + key);
    }

    /**
     * Check if the key is in progress.
     */
    public boolean isInProgress(String key) {
        String cached = redisTemplate.opsForValue().get(REDIS_PREFIX + key);
        return "IN_PROGRESS".equals(cached);
    }

    private void handleExistingKey(String key, String requestHash, String cachedResponse) {
        if ("IN_PROGRESS".equals(cachedResponse)) {
            throw new IdempotencyConflictException(
                    "Yeu cau truoc do voi Idempotency-Key nay van dang duoc xu ly.",
                    IdempotencyConflictException.ConflictType.REQUEST_IN_PROGRESS
            );
        }
        // Response is cached - will be replayed by filter
    }

    private String hashBody(String body) {
        if (body == null) return "empty";
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(body.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return Integer.toHexString(body.hashCode());
        }
    }
}
