package vn.unihub.backend.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Data
@Component
@ConfigurationProperties(prefix = "application.rate-limit")
public class RateLimitProperties {

    /**
     * Reverse proxies allowed to supply forwarding headers in the current environment.
     * Defaults keep local development working without trusting arbitrary clients.
     */
    private List<String> trustedProxies = new ArrayList<>(List.of(
            "127.0.0.1",
            "::1",
            "0:0:0:0:0:0:0:1"
    ));

    private List<Policy> policies = new ArrayList<>();

    public boolean isTrustedProxy(String remoteAddress) {
        if (remoteAddress == null || remoteAddress.isBlank()) {
            return false;
        }
        return trustedProxies.stream()
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .anyMatch(remoteAddress::equals);
    }

    @Data
    public static class Policy {
        private String scope;
        private String endpoint;
        private String roleCode;
        private int limitValue;
        private int windowSeconds;
        private String algorithm;
        private boolean enabled = true;
    }
}
