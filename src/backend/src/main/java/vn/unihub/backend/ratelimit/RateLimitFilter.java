package vn.unihub.backend.ratelimit;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.unihub.backend.config.RateLimitProperties;
import vn.unihub.backend.entity.audit.RateLimitPolicy;
import vn.unihub.backend.repository.RateLimitPolicyRepository;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private final RateLimiterService rateLimiterService;
    private final RateLimitProperties rateLimitProperties;
    private final RateLimitPolicyRepository policyRepository;

    private static final String RATE_LIMITED_MESSAGE = "Ban dang gui yeu cau qua nhanh. Vui long thu lai sau vai giay.";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String endpoint = method + ":" + reducePath(path);

        // Find matching policies for this endpoint
        List<RateLimitPolicy> dbPolicies = policyRepository.findByEnabledTrue();
        List<RateLimitProperties.Policy> configPolicies = rateLimitProperties.getPolicies();

        for (RateLimitPolicy policy : dbPolicies) {
            if (matches(policy.getEndpoint(), path) && tryConsumeAndCheck(policy, request, response)) {
                return;
            }
        }

        for (RateLimitProperties.Policy configPolicy : configPolicies) {
            if (!configPolicy.isEnabled()) continue;
            if (matches(configPolicy.getEndpoint(), path)
                    && tryConsumeAndCheck(configPolicy, request, response)) {
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean tryConsumeAndCheck(RateLimitPolicy policy, HttpServletRequest request,
                                        HttpServletResponse response) throws IOException {
        String identity = resolveIdentity(request, policy.getScope());
        RateLimiterService.RateLimitResult result = rateLimiterService.tryConsume(
                policy.getScope(), identity, normalizePath(policy.getEndpoint()),
                policy.getLimitValue(), policy.getWindowSeconds()
        );

        if (!result.allowed()) {
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetAtEpochSeconds()));
            response.getWriter().write(String.format(
                    "{\"error\":\"RATE_LIMITED\",\"message\":\"%s\",\"retryAfterSeconds\":%d}",
                    RATE_LIMITED_MESSAGE, result.retryAfterSeconds()
            ));
            log.warn("Rate limited: scope={} identity={} endpoint={}",
                    policy.getScope(), identity, policy.getEndpoint());
            return true;
        }
        return false;
    }

    private boolean tryConsumeAndCheck(RateLimitProperties.Policy configPolicy,
                                        HttpServletRequest request,
                                        HttpServletResponse response) throws IOException {
        String identity = resolveIdentity(request, configPolicy.getScope());
        RateLimiterService.RateLimitResult result = rateLimiterService.tryConsume(
                configPolicy.getScope(), identity, configPolicy.getEndpoint(),
                configPolicy.getLimitValue(), configPolicy.getWindowSeconds()
        );

        if (!result.allowed()) {
            response.setStatus(429);
            response.setContentType("application/json;charset=UTF-8");
            response.setHeader("Retry-After", String.valueOf(result.retryAfterSeconds()));
            response.setHeader("X-RateLimit-Limit", String.valueOf(result.limit()));
            response.setHeader("X-RateLimit-Remaining", "0");
            response.setHeader("X-RateLimit-Reset", String.valueOf(result.resetAtEpochSeconds()));
            response.getWriter().write(String.format(
                    "{\"error\":\"RATE_LIMITED\",\"message\":\"%s\",\"retryAfterSeconds\":%d}",
                    RATE_LIMITED_MESSAGE, result.retryAfterSeconds()
            ));
            return true;
        }
        return false;
    }

    private String resolveIdentity(HttpServletRequest request, String scope) {
        return switch (scope) {
            case "USER" -> {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                yield (auth != null && auth.isAuthenticated() && auth.getPrincipal() != null)
                        ? auth.getName() : "anonymous";
            }
            case "ROLE" -> {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.isAuthenticated()) {
                    yield auth.getAuthorities().stream()
                            .findFirst()
                            .map(Object::toString)
                            .orElse("anonymous");
                }
                yield "anonymous";
            }
            default -> // IP-based
                    getClientIP(request);
        };
    }

    private String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private boolean matches(String pattern, String path) {
        // Simple prefix + path matching
        String normalizedPattern = normalizePath(pattern);
        if (normalizedPattern.endsWith("/**")) {
            String prefix = normalizedPattern.replace("/**", "");
            return path.startsWith(prefix);
        }
        return path.equals(normalizedPattern);
    }

    private String normalizePath(String path) {
        if (path == null) return "";
        return path.replaceAll("/+$", "");
    }

    private String reducePath(String path) {
        // Simplify path with UUIDs to pattern for matching
        return path.replaceAll(
                "/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                "/{id}"
        );
    }
}
