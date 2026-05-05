package vn.unihub.backend.entity.catalog;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "workshop_categories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkshopCategory {

    @EmbeddedId
    private WorkshopCategoryId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("workshopId")
    @JoinColumn(name = "workshop_id")
    private Workshop workshop;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("categoryId")
    @JoinColumn(name = "category_id")
    private Category category;
}
