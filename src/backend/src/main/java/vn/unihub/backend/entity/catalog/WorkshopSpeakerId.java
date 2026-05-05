package vn.unihub.backend.entity.catalog;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.*;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkshopSpeakerId implements Serializable {

    @Column(name = "workshop_id")
    private UUID workshopId;

    @Column(name = "speaker_id")
    private UUID speakerId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkshopSpeakerId that = (WorkshopSpeakerId) o;
        return Objects.equals(workshopId, that.workshopId) && Objects.equals(speakerId, that.speakerId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workshopId, speakerId);
    }
}
