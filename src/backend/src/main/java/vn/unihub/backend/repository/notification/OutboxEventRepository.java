package vn.unihub.backend.repository.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.notification.OutboxEvent;

import java.util.List;
import java.util.UUID;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {
    
    @Query("SELECT e FROM OutboxEvent e WHERE e.status = :status AND e.availableAt <= CURRENT_TIMESTAMP ORDER BY e.availableAt ASC LIMIT :limit")
    List<OutboxEvent> findPendingEvents(String status, int limit);
}
