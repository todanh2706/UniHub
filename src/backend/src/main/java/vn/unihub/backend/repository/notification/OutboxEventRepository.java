package vn.unihub.backend.repository.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.notification.OutboxEvent;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = :status AND e.availableAt <= :now ORDER BY e.availableAt ASC")
    List<OutboxEvent> findPendingEvents(String status, java.time.Instant now, org.springframework.data.domain.Pageable pageable);
}
