package vn.unihub.backend.entity.audit;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "circuit_breaker_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CircuitBreakerEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "service_name", nullable = false)
    private String serviceName;

    @Column(name = "from_state", nullable = false)
    private String fromState;

    @Column(name = "to_state", nullable = false)
    private String toState;

    private String reason;

    @Column(name = "failure_count")
    private Integer failureCount;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
