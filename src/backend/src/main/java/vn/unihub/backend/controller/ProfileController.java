package vn.unihub.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import vn.unihub.backend.entity.auth.RoleUpgradeRequest;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.repository.auth.RoleUpgradeRequestRepository;
import vn.unihub.backend.repository.auth.UserRepository;
import vn.unihub.backend.dto.auth.RoleUpgradeRequestResponse;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final UserRepository userRepository;
    private final RoleUpgradeRequestRepository roleUpgradeRequestRepository;

    @GetMapping
    public ResponseEntity<?> getProfile() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/upgrade-request")
    public ResponseEntity<?> requestUpgrade(@RequestBody Map<String, String> payload) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();
        
        User user = userOpt.get();
        String requestedRole = payload.getOrDefault("requestedRole", "ORGANIZER");
        String reason = payload.get("reason");

        // Check if already requested and pending
        Optional<RoleUpgradeRequest> existing = roleUpgradeRequestRepository.findByUserAndStatus(user, "PENDING");
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "You already have a pending request."));
        }

        RoleUpgradeRequest request = RoleUpgradeRequest.builder()
                .user(user)
                .requestedRole(requestedRole)
                .status("PENDING")
                .reason(reason)
                .build();
        roleUpgradeRequestRepository.save(request);

        return ResponseEntity.ok(Map.of("message", "Upgrade request submitted successfully"));
    }

    @GetMapping("/upgrade-request")
    public ResponseEntity<RoleUpgradeRequestResponse> getMyUpgradeRequest() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) return ResponseEntity.notFound().build();

        // Get the latest request
        return roleUpgradeRequestRepository.findFirstByUserOrderByCreatedAtDesc(userOpt.get())
                .map(req -> RoleUpgradeRequestResponse.builder()
                        .id(req.getId())
                        .requestedRole(req.getRequestedRole())
                        .status(req.getStatus())
                        .reason(req.getReason())
                        .createdAt(req.getCreatedAt())
                        .build())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok().build()); // Return 200 OK empty body if no request
    }
}
