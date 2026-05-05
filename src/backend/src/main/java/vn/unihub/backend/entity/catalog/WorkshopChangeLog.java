package vn.unihub.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;
import vn.unihub.backend.entity.auth.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "workshop_change_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkshopChangeLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workshop_id", nullable = false)
    private Workshop workshop;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by", nullable = false)
    private User changedBy;

    private String reason;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt;
}
