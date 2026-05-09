package vn.unihub.backend.repository.ai;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.ai.AiSummary;

import java.util.Optional;
import java.util.UUID;

public interface AiSummaryRepository extends JpaRepository<AiSummary, UUID> {
    Optional<AiSummary> findTopByDocumentIdOrderByCreatedAtDesc(UUID documentId);
}
