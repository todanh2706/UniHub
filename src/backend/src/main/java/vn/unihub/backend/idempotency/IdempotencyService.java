package vn.unihub.backend.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
public class IdempotencyService {

    private final IdempotencyKeyRepository repository;
    private final RedisTemplate<String, String> redisTemplate;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyKeyRepository repository,
                              RedisTemplate<String, String> redisTemplate) {
        this.repository = repository;
        this.redisTemplate = redisTemplate;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    private static final String REDIS_PREFIX = "idem:";
    private static final long TTL_SECONDS = 3600; // 1 hour

    /**
     * Reserve an idempotency key for a request.
     * Throws IdempotencyConflictException if key already exists or request is in progress.
     */
    @Transactional
    public void reserve(String key, User user, String endpoint, String requestBody) {
        String requestHash = buildRequestFingerprint(endpoint, requestBody);
        Optional<IdempotencyKey> existing = repository.findByKey(key);

        // Check Redis cache first
        String cached = redisTemplate.opsForValue().get(REDIS_PREFIX + key);
        if (cached != null) {
            handleExistingKey(requestHash, cached, existing);
        }

        // Check PostgreSQL
        if (existing.isPresent()) {
            IdempotencyKey existingKey = existing.get();
            if (existingKey.getRequestHash().equals(requestHash)) {
                // If responseBody is not null, it's already completed
                if (existingKey.getResponseBody() != null) {
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
                .responseBody(null)
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

                CachedResponseEnvelope envelope = new CachedResponseEnvelope(
                        idemKey.getRequestHash(),
                        statusCode,
                        responseJson
                );
                redisTemplate.opsForValue().set(
                        REDIS_PREFIX + key,
                        objectMapper.writeValueAsString(envelope),
                        TTL_SECONDS,
                        TimeUnit.SECONDS
                );
                return;
            }

            // Fallback for unexpected missing DB row
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
     * Get a previously completed response body only.
     */
    public String getCachedResponse(String key) {
        CachedResult cachedResult = getCachedResult(key, null, null);
        return cachedResult != null ? cachedResult.responseBody() : null;
    }

    /**
     * Get a previously completed response with request fingerprint validation.
     */
    public CachedResult getCachedResult(String key, String endpoint, String requestBody) {
        String expectedRequestHash = endpoint == null ? null : buildRequestFingerprint(endpoint, requestBody);
        Optional<IdempotencyKey> existing = repository.findByKey(key);

        // Try Redis first
        String cached = redisTemplate.opsForValue().get(REDIS_PREFIX + key);
        if (cached != null) {
            if ("IN_PROGRESS".equals(cached)) {
                return null;
            }

            CachedResponseEnvelope envelope = parseEnvelope(cached);
            if (envelope != null) {
                return new CachedResult(envelope.responseBody(), envelope.statusCode());
            }
        }

        // Fallback to PostgreSQL
        return existing
                .map(idemKey -> {
                    validateRequestHash(expectedRequestHash, idemKey.getRequestHash());
                    if (idemKey.getResponseBody() == null) {
                        return null;
                    }
                    return new CachedResult(
                            idemKey.getResponseBody(),
                            idemKey.getStatusCode() != null ? idemKey.getStatusCode() : 200
                    );
                })
                .orElseGet(() -> cached == null || "IN_PROGRESS".equals(cached)
                        ? null
                        : new CachedResult(cached, 200));
    }

    /**
     * Check if the key is in progress.
     */
    public boolean isInProgress(String key) {
        String cached = redisTemplate.opsForValue().get(REDIS_PREFIX + key);
        if ("IN_PROGRESS".equals(cached)) {
            return true;
        }

        // If not in Redis, check DB
        return repository.findByKey(key)
                .map(k -> k.getResponseBody() == null)
                .orElse(false);
    }

    public String buildRequestFingerprint(String endpoint, String requestBody) {
        return hashBody((endpoint == null ? "" : endpoint) + "\n" + (requestBody == null ? "empty" : requestBody));
    }

    private void handleExistingKey(String requestHash, String cachedResponse,
                                   Optional<IdempotencyKey> existingKey) {
        if ("IN_PROGRESS".equals(cachedResponse)) {
            throw new IdempotencyConflictException(
                    "Yeu cau truoc do voi Idempotency-Key nay van dang duoc xu ly.",
                    IdempotencyConflictException.ConflictType.REQUEST_IN_PROGRESS
            );
        }

        CachedResponseEnvelope envelope = parseEnvelope(cachedResponse);
        if (envelope != null) {
            validateRequestHash(requestHash, envelope.requestHash());
            return;
        }

        existingKey.ifPresent(idemKey -> validateRequestHash(requestHash, idemKey.getRequestHash()));
        // Legacy cached JSON without envelope: rely on DB request hash if present.
    }

    private void validateRequestHash(String expectedRequestHash, String actualRequestHash) {
        if (expectedRequestHash != null && !expectedRequestHash.equals(actualRequestHash)) {
            throw new IdempotencyConflictException(
                    "Idempotency-Key nay da duoc dung cho mot request khac.",
                    IdempotencyConflictException.ConflictType.KEY_REUSED_WITH_DIFFERENT_REQUEST
            );
        }
    }

    private CachedResponseEnvelope parseEnvelope(String cachedResponse) {
        try {
            return objectMapper.readValue(cachedResponse, CachedResponseEnvelope.class);
        } catch (Exception ignored) {
            return null;
        }
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

    public record CachedResult(String responseBody, int statusCode) {
    }

    private record CachedResponseEnvelope(String requestHash, int statusCode, String responseBody) {
    }
}
