package vn.unihub.backend.idempotency;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import vn.unihub.backend.exception.IdempotencyConflictException;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
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

        CachedBodyHttpServletRequest wrappedRequest = new CachedBodyHttpServletRequest(request);
        String requestBody = new String(wrappedRequest.getCachedBody(), StandardCharsets.UTF_8);

        try {
            IdempotencyService.CachedResult cachedResult = idempotencyService.getCachedResult(
                    idempotencyKey,
                    request.getRequestURI(),
                    requestBody
            );
            if (cachedResult != null) {
                response.setContentType("application/json;charset=UTF-8");
                response.setStatus(cachedResult.statusCode());
                response.getWriter().write(cachedResult.responseBody());
                log.info("Replayed idempotent response for key: {}", idempotencyKey);
                return;
            }

            filterChain.doFilter(wrappedRequest, response);
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

    private static class CachedBodyHttpServletRequest extends HttpServletRequestWrapper {
        private final byte[] cachedBody;

        private CachedBodyHttpServletRequest(HttpServletRequest request) throws IOException {
            super(request);
            this.cachedBody = request.getInputStream().readAllBytes();
        }

        private byte[] getCachedBody() {
            return cachedBody;
        }

        @Override
        public ServletInputStream getInputStream() {
            ByteArrayInputStream inputStream = new ByteArrayInputStream(cachedBody);
            return new ServletInputStream() {
                @Override
                public int read() {
                    return inputStream.read();
                }

                @Override
                public boolean isFinished() {
                    return inputStream.available() == 0;
                }

                @Override
                public boolean isReady() {
                    return true;
                }

                @Override
                public void setReadListener(ReadListener readListener) {
                    // no-op
                }
            };
        }

        @Override
        public BufferedReader getReader() {
            return new BufferedReader(new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
        }
    }
}
