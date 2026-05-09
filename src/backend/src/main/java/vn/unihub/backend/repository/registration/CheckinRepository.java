package vn.unihub.backend.repository.registration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.registration.Checkin;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CheckinRepository extends JpaRepository<Checkin, UUID> {
    boolean existsByClientEventId(String clientEventId);
    Optional<Checkin> findByClientEventId(String clientEventId);
    boolean existsByRegistrationId(UUID registrationId);
}
