package vn.unihub.backend.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class RateLimiterService {

    private final RedisTemplate<String, String> redisTemplate;
    private final Map<String, Bucket> localFallbackBuckets = new ConcurrentHashMap<>();

    // Lua script for atomic token bucket consume
    private static final String TOKEN_BUCKET_SCRIPT = """
            local key = KEYS[1]
            local now = tonumber(ARGV[1])
            local capacity = tonumber(ARGV[2])
            local refillRate = tonumber(ARGV[3])
            local windowSeconds = tonumber(ARGV[4])

            local data = redis.call('HMGET', key, 'tokens', 'last_refill_at')
            local tokens = tonumber(data[1])
            local lastRefill = tonumber(data[2])

            if tokens == nil then
                tokens = capacity
                lastRefill = now
            end

            local elapsed = now - lastRefill
            if refillRate > 0 then
                tokens = math.min(capacity, tokens + (elapsed * refillRate))
            end

            local result = {}
            if tokens >= 1 then
                tokens = tokens - 1
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill_at', now)
                redis.call('EXPIRE', key, math.ceil(windowSeconds * 2))
                result = {1, tokens, capacity, now + windowSeconds}
            else
                redis.call('HMSET', key, 'tokens', tokens, 'last_refill_at', now)
                redis.call('EXPIRE', key, math.ceil(windowSeconds * 2))
                result = {0, tokens, capacity, now + windowSeconds}
            end
            return result
            """;

    private final RedisScript<List> tokenBucketScript;

    public RateLimiterService(RedisTemplate<String, String> redisTemplate) {
        this.redisTemplate = redisTemplate;
        this.tokenBucketScript = RedisScript.of(TOKEN_BUCKET_SCRIPT, List.class);
    }

    /**
     * Attempt to consume a token. Returns RateLimitResult with allowed/denied info.
     */
    public RateLimitResult tryConsume(String scope, String identity, String endpoint,
                                      int limitValue, int windowSeconds) {
        String key = buildKey(scope, identity, endpoint);

        try {
            long now = System.currentTimeMillis() / 1000;
            double refillRate = (double) limitValue / windowSeconds;

            @SuppressWarnings("unchecked")
            List<Long> result = (List<Long>) redisTemplate.execute(
                    tokenBucketScript,
                    Collections.singletonList(key),
                    String.valueOf(now),
                    String.valueOf(limitValue),
                    String.valueOf(refillRate),
                    String.valueOf(windowSeconds)
            );

            if (result == null || result.isEmpty()) {
                log.warn("Rate limiter script returned null for key: {}", key);
                return RateLimitResult.allowed(limitValue, limitValue, now + windowSeconds);
            }

            long allowed = result.get(0);
            long remaining = result.size() > 1 ? result.get(1) : 0;
            long capacity = result.size() > 2 ? result.get(2) : limitValue;
            long resetAt = result.size() > 3 ? result.get(3) : now + windowSeconds;

            if (allowed == 1) {
                return RateLimitResult.allowed(remaining, capacity, resetAt);
            } else {
                return RateLimitResult.denied(retryAfterSeconds(remaining, refillRate), capacity, resetAt);
            }

        } catch (Exception e) {
            log.error("Redis rate limiter error, using local fallback for key: {}", key, e);
            return localFallbackConsume(key, limitValue, windowSeconds);
        }
    }

    private RateLimitResult localFallbackConsume(String key, int limitValue, int windowSeconds) {
        Bucket bucket = localFallbackBuckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.builder()
                    .capacity(limitValue)
                    .refillGreedy(limitValue, Duration.ofSeconds(windowSeconds))
                    .build();
            return Bucket.builder().addLimit(limit).build();
        });

        if (bucket.tryConsume(1)) {
            long remaining = bucket.getAvailableTokens();
            return RateLimitResult.allowed(remaining, limitValue,
                    System.currentTimeMillis() / 1000 + windowSeconds);
        } else {
            return RateLimitResult.denied(1, limitValue,
                    System.currentTimeMillis() / 1000 + windowSeconds);
        }
    }

    private String buildKey(String scope, String identity, String endpoint) {
        return String.format("rl:%s:%s:%s", scope, identity, endpoint);
    }

    private int retryAfterSeconds(long remainingTokens, double refillRate) {
        if (refillRate <= 0) return 1;
        return Math.max(1, (int) Math.ceil(1.0 / refillRate));
    }

    public record RateLimitResult(
            boolean allowed,
            long remaining,
            long limit,
            long resetAtEpochSeconds,
            int retryAfterSeconds
    ) {
        public static RateLimitResult allowed(long remaining, long limit, long resetAt) {
            return new RateLimitResult(true, remaining, limit, resetAt, 0);
        }

        public static RateLimitResult denied(int retryAfterSeconds, long limit, long resetAt) {
            return new RateLimitResult(false, 0, limit, resetAt, retryAfterSeconds);
        }
    }
}
