package vn.unihub.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.audit.RateLimitPolicy;

import java.util.List;
import java.util.UUID;

@Repository
public interface RateLimitPolicyRepository extends JpaRepository<RateLimitPolicy, UUID> {
    List<RateLimitPolicy> findByEnabledTrue();
    List<RateLimitPolicy> findByEndpointAndScopeAndEnabledTrue(String endpoint, String scope);
}
