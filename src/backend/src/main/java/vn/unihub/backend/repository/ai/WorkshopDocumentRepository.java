package vn.unihub.backend.repository.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.ai.WorkshopDocument;

import java.util.List;
import java.util.UUID;

public interface WorkshopDocumentRepository extends JpaRepository<WorkshopDocument, UUID> {
    List<WorkshopDocument> findByWorkshopId(UUID workshopId);
}
