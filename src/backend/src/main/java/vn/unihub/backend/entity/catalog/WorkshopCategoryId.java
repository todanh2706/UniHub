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
public class WorkshopCategoryId implements Serializable {

    @Column(name = "workshop_id")
    private UUID workshopId;

    @Column(name = "category_id")
    private UUID categoryId;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        WorkshopCategoryId that = (WorkshopCategoryId) o;
        return Objects.equals(workshopId, that.workshopId) && Objects.equals(categoryId, that.categoryId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workshopId, categoryId);
    }
}
