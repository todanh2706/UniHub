package vn.unihub.backend.ratelimit;

import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import vn.unihub.backend.config.RateLimitProperties;
import vn.unihub.backend.entity.audit.RateLimitPolicy;
import vn.unihub.backend.repository.RateLimitPolicyRepository;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RateLimitFilterTest {

    private final RateLimiterService rateLimiterService = mock(RateLimiterService.class);
    private final RateLimitPolicyRepository policyRepository = mock(RateLimitPolicyRepository.class);
    private final RateLimitProperties rateLimitProperties = new RateLimitProperties();
    private final TestableRateLimitFilter filter = new TestableRateLimitFilter(
            rateLimiterService,
            rateLimitProperties,
            policyRepository
    );

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void methodAndUuidPathConfigPolicy_matchesReducedRequestPath() throws Exception {
        rateLimitProperties.setPolicies(List.of(policy("IP", "GET:/api/v1/public/workshops/{id}", 10, 60, true)));
        when(policyRepository.findByEnabledTrue()).thenReturn(List.of());
        when(rateLimiterService.tryConsume(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(RateLimiterService.RateLimitResult.allowed(9, 10, 999));

        MockHttpServletRequest request = new MockHttpServletRequest("GET",
                "/api/v1/public/workshops/123e4567-e89b-12d3-a456-426614174000");
        request.setRemoteAddr("198.51.100.10");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.invoke(request, response, new MockFilterChain());

        ArgumentCaptor<String> endpointCaptor = ArgumentCaptor.forClass(String.class);
        verify(rateLimiterService).tryConsume(anyString(), anyString(), endpointCaptor.capture(), anyInt(), anyInt());
        assertEquals("GET:/api/v1/public/workshops/{id}", endpointCaptor.getValue());
        assertEquals(200, response.getStatus());
    }

    @Test
    void dbPolicies_takePrecedenceOverYamlFallback() throws Exception {
        RateLimitPolicy dbPolicy = RateLimitPolicy.builder()
                .scope("IP")
                .endpoint("/api/v1/registrations")
                .limitValue(20)
                .windowSeconds(3)
                .algorithm("TOKEN_BUCKET")
                .enabled(true)
                .build();
        rateLimitProperties.setPolicies(List.of(policy("IP", "POST:/api/v1/registrations", 5, 60, true)));
        when(policyRepository.findByEnabledTrue()).thenReturn(List.of(dbPolicy));
        when(rateLimiterService.tryConsume(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(RateLimiterService.RateLimitResult.allowed(19, 20, 999));

        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/v1/registrations");
        request.setRemoteAddr("198.51.100.11");

        filter.invoke(request, new MockHttpServletResponse(), new MockFilterChain());

        verify(rateLimiterService).tryConsume("IP", "198.51.100.11", "/api/v1/registrations", 20, 3);
        verify(rateLimiterService, never()).tryConsume("IP", "198.51.100.11", "POST:/api/v1/registrations", 5, 60);
    }

    @Test
    void trustedProxy_allowsForwardedClientIp() throws Exception {
        rateLimitProperties.setTrustedProxies(List.of("10.0.0.10"));
        rateLimitProperties.setPolicies(List.of(policy("IP", "GET:/api/v1/public/workshops", 10, 60, true)));
        when(policyRepository.findByEnabledTrue()).thenReturn(List.of());
        when(rateLimiterService.tryConsume(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(RateLimiterService.RateLimitResult.allowed(9, 10, 999));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/public/workshops");
        request.setRemoteAddr("10.0.0.10");
        request.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.10");

        filter.invoke(request, new MockHttpServletResponse(), new MockFilterChain());

        verify(rateLimiterService).tryConsume("IP", "203.0.113.5", "GET:/api/v1/public/workshops", 10, 60);
    }

    @Test
    void untrustedProxy_ignoresForwardedClientIp() throws Exception {
        rateLimitProperties.setTrustedProxies(List.of("10.0.0.10"));
        rateLimitProperties.setPolicies(List.of(policy("IP", "GET:/api/v1/public/workshops", 10, 60, true)));
        when(policyRepository.findByEnabledTrue()).thenReturn(List.of());
        when(rateLimiterService.tryConsume(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(RateLimiterService.RateLimitResult.allowed(9, 10, 999));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/public/workshops");
        request.setRemoteAddr("198.51.100.12");
        request.addHeader("X-Forwarded-For", "203.0.113.5, 10.0.0.10");

        filter.invoke(request, new MockHttpServletResponse(), new MockFilterChain());

        verify(rateLimiterService).tryConsume("IP", "198.51.100.12", "GET:/api/v1/public/workshops", 10, 60);
    }

    @Test
    void deniedPolicy_returns429WithRetryHeaders() throws Exception {
        rateLimitProperties.setPolicies(List.of(policy("IP", "GET:/api/v1/public/workshops", 300, 60, true)));
        when(policyRepository.findByEnabledTrue()).thenReturn(List.of());
        when(rateLimiterService.tryConsume(anyString(), anyString(), anyString(), anyInt(), anyInt()))
                .thenReturn(RateLimiterService.RateLimitResult.denied(4, 300, 12345));

        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/public/workshops");
        request.setRemoteAddr("198.51.100.13");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.invoke(request, response, chain);

        assertEquals(429, response.getStatus());
        assertEquals("4", response.getHeader("Retry-After"));
        assertEquals("300", response.getHeader("X-RateLimit-Limit"));
        assertEquals("0", response.getHeader("X-RateLimit-Remaining"));
        assertEquals("12345", response.getHeader("X-RateLimit-Reset"));
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        assertEquals("{\"error\":\"RATE_LIMITED\",\"message\":\"Ban dang gui yeu cau qua nhanh. Vui long thu lai sau vai giay.\",\"retryAfterSeconds\":4}",
                response.getContentAsString());
        assertNull(chain.getRequest());
    }

    private RateLimitProperties.Policy policy(String scope, String endpoint, int limitValue, int windowSeconds,
                                              boolean enabled) {
        RateLimitProperties.Policy policy = new RateLimitProperties.Policy();
        policy.setScope(scope);
        policy.setEndpoint(endpoint);
        policy.setLimitValue(limitValue);
        policy.setWindowSeconds(windowSeconds);
        policy.setAlgorithm("TOKEN_BUCKET");
        policy.setEnabled(enabled);
        return policy;
    }

    private static class TestableRateLimitFilter extends RateLimitFilter {

        private TestableRateLimitFilter(RateLimiterService rateLimiterService,
                                        RateLimitProperties rateLimitProperties,
                                        RateLimitPolicyRepository policyRepository) {
            super(rateLimiterService, rateLimitProperties, policyRepository);
        }

        void invoke(MockHttpServletRequest request, MockHttpServletResponse response, MockFilterChain filterChain)
                throws ServletException, IOException {
            doFilterInternal(request, response, filterChain);
        }
    }
}
