package vn.unihub.backend.entity.registration;

import jakarta.persistence.*;
import lombok.*;
import vn.unihub.backend.entity.auth.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "checkins")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Checkin {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "registration_id", nullable = false, unique = true)
    private Registration registration;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_in_by", nullable = false)
    private User checkedInBy;

    @Column(name = "client_event_id", nullable = false, unique = true)
    private String clientEventId;

    @Column(nullable = false)
    private String source;

    @Column(name = "checked_in_at", nullable = false)
    private Instant checkedInAt;

    @Column(name = "synced_at")
    private Instant syncedAt;

    @Column(name = "device_id")
    private String deviceId;
}
