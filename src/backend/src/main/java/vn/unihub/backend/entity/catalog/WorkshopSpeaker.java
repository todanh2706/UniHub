package vn.unihub.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workshop_speakers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkshopSpeaker {

    @EmbeddedId
    private WorkshopSpeakerId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("workshopId")
    @JoinColumn(name = "workshop_id")
    private Workshop workshop;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("speakerId")
    @JoinColumn(name = "speaker_id")
    private Speaker speaker;

    @Column(name = "display_order")
    private Integer displayOrder;
}
