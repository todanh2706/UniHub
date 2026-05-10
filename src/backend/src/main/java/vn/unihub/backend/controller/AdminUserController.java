package vn.unihub.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import vn.unihub.backend.entity.auth.RoleUpgradeRequest;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.repository.auth.RoleUpgradeRequestRepository;
import vn.unihub.backend.repository.auth.UserRepository;
import vn.unihub.backend.repository.auth.UserRoleRepository;
import vn.unihub.backend.repository.auth.RoleRepository;
import vn.unihub.backend.entity.auth.UserRole;
import vn.unihub.backend.entity.auth.UserRoleId;
import vn.unihub.backend.entity.auth.Role;
import vn.unihub.backend.dto.auth.RoleUpgradeRequestResponse;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserRepository userRepository;
    private final RoleUpgradeRequestRepository roleUpgradeRequestRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    @GetMapping("/users")
    public ResponseEntity<Page<User>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        String formattedSearch = (search != null && !search.trim().isEmpty()) ? "%" + search.trim() + "%" : null;
        String formattedStatus = (status != null && !status.trim().isEmpty()) ? status.trim() : null;
        return ResponseEntity.ok(userRepository.findWithFilter(formattedSearch, formattedStatus, pageable));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<User> getUser(@PathVariable UUID id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable UUID id) {
        return userRepository.findById(id).map(user -> {
            if ("ACTIVE".equals(user.getStatus())) {
                user.setStatus("INACTIVE");
            } else {
                user.setStatus("ACTIVE");
            }
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Status updated successfully", "newStatus", user.getStatus()));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable UUID id) {
        return userRepository.findById(id).map(user -> {
            userRepository.delete(user);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/requests")
    public ResponseEntity<Page<RoleUpgradeRequestResponse>> getUpgradeRequests(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        String formattedStatus = (status != null && !status.trim().isEmpty()) ? status.trim() : null;
        
        Page<RoleUpgradeRequest> requests = roleUpgradeRequestRepository.findWithFilter(formattedStatus, pageable);
        
        return ResponseEntity.ok(requests.map(req -> RoleUpgradeRequestResponse.builder()
                .id(req.getId())
                .user(RoleUpgradeRequestResponse.UserInfo.builder()
                        .fullName(req.getUser().getFullName())
                        .email(req.getUser().getEmail())
                        .build())
                .requestedRole(req.getRequestedRole())
                .status(req.getStatus())
                .reason(req.getReason())
                .createdAt(req.getCreatedAt())
                .build()));
    }

    @PutMapping("/requests/{id}/process")
    public ResponseEntity<?> processRequest(@PathVariable UUID id, @RequestBody Map<String, String> payload) {
        String action = payload.get("action"); // APPROVED or REJECTED
        String adminEmail = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
        
        Optional<User> adminOpt = userRepository.findByEmail(adminEmail);
        if (adminOpt.isEmpty()) return ResponseEntity.badRequest().build();

        return roleUpgradeRequestRepository.findById(id).map(req -> {
            if (!"PENDING".equals(req.getStatus())) {
                return ResponseEntity.badRequest().body(Map.of("message", "Request already processed"));
            }

            req.setStatus(action);
            req.setProcessedBy(adminOpt.get());

            if ("APPROVED".equals(action)) {
                // Update User Role
                Optional<Role> roleOpt = roleRepository.findByCode(req.getRequestedRole());
                if (roleOpt.isPresent()) {
                    // Check if already has role
                    boolean hasRole = userRoleRepository.findById(new UserRoleId(req.getUser().getId(), roleOpt.get().getId())).isPresent();
                    if (!hasRole) {
                        UserRole newRole = UserRole.builder()
                            .id(new UserRoleId(req.getUser().getId(), roleOpt.get().getId()))
                            .user(req.getUser())
                            .role(roleOpt.get())
                            .build();
                        userRoleRepository.save(newRole);
                    }
                }
            }
            roleUpgradeRequestRepository.save(req);
            return ResponseEntity.ok(Map.of("message", "Request processed successfully"));
        }).orElse(ResponseEntity.notFound().build());
    }
}
