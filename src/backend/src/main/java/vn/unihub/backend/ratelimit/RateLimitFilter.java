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
import java.util.Comparator;
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
        String requestMethod = normalizeMethod(request.getMethod());
        String requestPath = normalizeRequestPath(request.getRequestURI());

        List<RateLimitPolicy> matchingDbPolicies = policyRepository.findByEnabledTrue().stream()
                .filter(policy -> matches(policy.getEndpoint(), requestMethod, requestPath))
                .sorted(Comparator.comparing(RateLimitPolicy::getEndpoint)
                        .thenComparing(RateLimitPolicy::getScope)
                        .thenComparing(RateLimitPolicy::getWindowSeconds)
                        .thenComparing(RateLimitPolicy::getLimitValue))
                .toList();

        if (!matchingDbPolicies.isEmpty()) {
            for (RateLimitPolicy policy : matchingDbPolicies) {
                if (tryConsumeAndCheck(policy, request, response)) {
                    return;
                }
            }
            filterChain.doFilter(request, response);
            return;
        }

        List<RateLimitProperties.Policy> matchingConfigPolicies = rateLimitProperties.getPolicies().stream()
                .filter(RateLimitProperties.Policy::isEnabled)
                .filter(policy -> matches(policy.getEndpoint(), requestMethod, requestPath))
                .sorted(Comparator.comparing(RateLimitProperties.Policy::getEndpoint)
                        .thenComparing(RateLimitProperties.Policy::getScope)
                        .thenComparing(RateLimitProperties.Policy::getWindowSeconds)
                        .thenComparing(RateLimitProperties.Policy::getLimitValue))
                .toList();

        for (RateLimitProperties.Policy configPolicy : matchingConfigPolicies) {
            if (tryConsumeAndCheck(configPolicy, request, response)) {
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
        String remoteAddress = request.getRemoteAddr();
        if (!isTrustedProxy(remoteAddress)) {
            return remoteAddress;
        }

        String xfHeader = request.getHeader("X-Forwarded-For");
        String forwardedClientIp = extractForwardedClientIp(xfHeader);
        return forwardedClientIp != null ? forwardedClientIp : remoteAddress;
    }

    private String extractForwardedClientIp(String xForwardedForHeader) {
        if (xForwardedForHeader == null || xForwardedForHeader.isBlank()) {
            return null;
        }

        for (String candidate : xForwardedForHeader.split(",")) {
            String ip = candidate.trim();
            if (!ip.isEmpty()) {
                return ip;
            }
        }
        return null;
    }

    private boolean isTrustedProxy(String remoteAddress) {
        return rateLimitProperties.isTrustedProxy(remoteAddress);
    }

    private boolean matches(String configuredEndpoint, String requestMethod, String requestPath) {
        EndpointPattern endpointPattern = parseEndpoint(configuredEndpoint);
        if (endpointPattern.method() != null && !endpointPattern.method().equals(requestMethod)) {
            return false;
        }

        String normalizedPatternPath = endpointPattern.path();
        if (normalizedPatternPath.endsWith("/**")) {
            String prefix = normalizedPatternPath.substring(0, normalizedPatternPath.length() - 3);
            return requestPath.startsWith(prefix);
        }
        return requestPath.equals(normalizedPatternPath);
    }

    private EndpointPattern parseEndpoint(String configuredEndpoint) {
        if (configuredEndpoint == null || configuredEndpoint.isBlank()) {
            return new EndpointPattern(null, "");
        }

        String normalized = configuredEndpoint.trim();
        int separatorIndex = normalized.indexOf(':');
        if (separatorIndex > 0 && separatorIndex + 1 < normalized.length()
                && normalized.charAt(separatorIndex + 1) == '/') {
            String method = normalizeMethod(normalized.substring(0, separatorIndex));
            String path = normalizePath(normalized.substring(separatorIndex + 1));
            return new EndpointPattern(method, path);
        }

        return new EndpointPattern(null, normalizePath(normalized));
    }

    private String normalizeMethod(String method) {
        return method == null ? "" : method.trim().toUpperCase();
    }

    private String normalizeRequestPath(String path) {
        return normalizePath(reducePath(path));
    }

    private String normalizePath(String path) {
        if (path == null || path.isBlank()) {
            return "";
        }
        String normalized = path.trim().replaceAll("/+$", "");
        return normalized.isEmpty() ? "/" : normalized;
    }

    private String reducePath(String path) {
        // Simplify path with UUIDs to pattern for matching
        return path.replaceAll(
                "/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}",
                "/{id}"
        );
    }

    private record EndpointPattern(String method, String path) {
    }
}
