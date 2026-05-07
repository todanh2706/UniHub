package vn.unihub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.audit.CircuitBreakerEvent;

import java.util.UUID;

@Repository
public interface CircuitBreakerEventRepository extends JpaRepository<CircuitBreakerEvent, UUID> {
}
