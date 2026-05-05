package vn.unihub.backend.repository.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.auth.Permission;

import java.util.List;
import java.util.UUID;

@Repository
public interface PermissionRepository extends JpaRepository<Permission, UUID> {
    
    @Query("SELECT DISTINCT p FROM Permission p " +
           "JOIN RolePermission rp ON p.id = rp.permission.id " +
           "JOIN UserRole ur ON rp.role.id = ur.role.id " +
           "WHERE ur.user.id = :userId")
    List<Permission> findPermissionsByUserId(@Param("userId") UUID userId);
}
