package vn.unihub.backend.repository.auth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import vn.unihub.backend.entity.auth.User;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.repository.query.Param;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);

    @Query("SELECT u FROM User u WHERE " +
           "(:search IS NULL OR LOWER(u.fullName) LIKE LOWER(CAST(:search AS String)) OR LOWER(u.email) LIKE LOWER(CAST(:search AS String))) " +
           "AND (:status IS NULL OR u.status = CAST(:status AS String))")
    Page<User> findWithFilter(@Param("search") String search, @Param("status") String status, Pageable pageable);
}
