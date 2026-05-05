package vn.unihub.backend.repository.catalog;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.unihub.backend.entity.catalog.Workshop;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WorkshopRepository extends JpaRepository<Workshop, UUID> {
    List<Workshop> findByStatusOrderByStartTimeAsc(String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from Workshop w where w.id = :id")
    Optional<Workshop> findByIdForUpdate(@Param("id") UUID id);

    @Query("""
            select case when count(w) > 0 then true else false end
            from Workshop w
            where w.id = :workshopId
              and w.startTime > :now
            """)
    boolean startsInFuture(@Param("workshopId") UUID workshopId, @Param("now") Instant now);
}
