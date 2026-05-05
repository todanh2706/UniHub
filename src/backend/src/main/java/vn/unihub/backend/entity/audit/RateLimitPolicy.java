package vn.unihub.backend.entity.audit;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "rate_limit_policies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RateLimitPolicy {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String scope;

    @Column(nullable = false)
    private String endpoint;

    @Column(name = "role_code")
    private String roleCode;

    @Column(name = "limit_value", nullable = false)
    private Integer limitValue;

    @Column(name = "window_seconds", nullable = false)
    private Integer windowSeconds;

    @Column(nullable = false)
    private String algorithm;

    @Column(nullable = false)
    private Boolean enabled;
}
