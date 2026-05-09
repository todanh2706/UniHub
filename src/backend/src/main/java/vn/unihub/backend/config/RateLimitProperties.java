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

    private List<Policy> policies = new ArrayList<>();

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
