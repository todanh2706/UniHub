package vn.unihub.backend.idempotency;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.exception.IdempotencyConflictException;
import vn.unihub.backend.security.CustomUserDetails;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@Slf4j
@Component
@RequiredArgsConstructor
public class IdempotencyFilter extends OncePerRequestFilter {

    private final IdempotencyService idempotencyService;

    private static final String HEADER_IDEMPOTENCY_KEY = "Idempotency-Key";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String idempotencyKey = request.getHeader(HEADER_IDEMPOTENCY_KEY);

        // Only apply idempotency to POST endpoints
        if (idempotencyKey == null || idempotencyKey.isBlank()
                || !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Check if response is already cached
        String cachedResponse = idempotencyService.getCachedResponse(idempotencyKey);
        if (cachedResponse != null && !"IN_PROGRESS".equals(cachedResponse)) {
            response.setContentType("application/json;charset=UTF-8");
            response.setStatus(200);
            response.getWriter().write(cachedResponse);
            log.info("Replayed idempotent response for key: {}", idempotencyKey);
            return;
        }

        // Wrap request to cache body for idempotency check
        ContentCachingRequestWrapper wrappedRequest = new ContentCachingRequestWrapper(request);

        try {
            filterChain.doFilter(wrappedRequest, response);

            // After successful processing, extract body and register idempotency
            // Note: For idempotency on POST /registrations, the controller handles it
            // This filter only handles replay

        } catch (Exception e) {
            if (e instanceof IdempotencyConflictException) {
                handleConflict((IdempotencyConflictException) e, response);
                return;
            }
            throw e;
        }
    }

    private void handleConflict(IdempotencyConflictException e, HttpServletResponse response)
            throws IOException {
        response.setStatus(409);
        response.setContentType("application/json;charset=UTF-8");

        String errorCode = switch (e.getConflictType()) {
            case REQUEST_IN_PROGRESS -> "REQUEST_IN_PROGRESS";
            case KEY_REUSED_WITH_DIFFERENT_REQUEST -> "IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_REQUEST";
        };

        response.getWriter().write(String.format(
                "{\"error\":\"%s\",\"message\":\"%s\"}",
                errorCode, e.getMessage()
        ));
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser();
        }
        return null;
    }
}
