package vn.unihub.backend.repository.registration;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.unihub.backend.entity.registration.Registration;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RegistrationRepository extends JpaRepository<Registration, UUID> {
    @Query("""
            select count(r)
            from Registration r
            where r.workshop.id = :workshopId
              and (
                r.status = 'CONFIRMED'
                or (r.status = 'PENDING_PAYMENT' and r.expiresAt is not null and r.expiresAt > :now)
              )
            """)
    long countActiveSeats(@Param("workshopId") UUID workshopId, @Param("now") Instant now);

    @Query("""
            select case when count(r) > 0 then true else false end
            from Registration r
            where r.student.id = :studentId
              and r.workshop.id = :workshopId
              and r.status in :statuses
            """)
    boolean existsByStudentAndWorkshopAndStatuses(
            @Param("studentId") UUID studentId,
            @Param("workshopId") UUID workshopId,
            @Param("statuses") Collection<String> statuses
    );

    @Query("""
            select case when count(r) > 0 then true else false end
            from Registration r
            join r.workshop existingW
            where r.student.id = :studentId
              and r.status in :statuses
              and existingW.startTime < :newEnd
              and existingW.endTime > :newStart
            """)
    boolean hasTimeOverlap(
            @Param("studentId") UUID studentId,
            @Param("newStart") Instant newStart,
            @Param("newEnd") Instant newEnd,
            @Param("statuses") Collection<String> statuses
    );

    List<Registration> findByStudentIdOrderByCreatedAtDesc(UUID studentId);

    @Query("""
            select r from Registration r
            where r.workshop.id = :workshopId
              and (:statuses is null or r.status in :statuses)
            order by r.createdAt desc
            """)
    Page<Registration> findByWorkshopAndOptionalStatus(
            @Param("workshopId") UUID workshopId,
            @Param("statuses") Collection<String> statuses,
            Pageable pageable
    );

    Optional<Registration> findByIdAndStudentId(UUID id, UUID studentId);
}
