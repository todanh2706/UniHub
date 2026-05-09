package vn.unihub.backend.repository.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.auth.RoleUpgradeRequest;
import vn.unihub.backend.entity.auth.User;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.repository.query.Param;

@Repository
public interface RoleUpgradeRequestRepository extends JpaRepository<RoleUpgradeRequest, UUID> {
    Optional<RoleUpgradeRequest> findByUserAndStatus(User user, String status);

    @Query("SELECT r FROM RoleUpgradeRequest r JOIN FETCH r.user " +
           "WHERE (:status IS NULL OR r.status = CAST(:status AS String)) " +
           "ORDER BY CASE WHEN r.status = 'PENDING' THEN 1 ELSE 2 END, r.createdAt DESC")
    Page<RoleUpgradeRequest> findWithFilter(@Param("status") String status, Pageable pageable);

    Optional<RoleUpgradeRequest> findFirstByUserOrderByCreatedAtDesc(User user);
}
