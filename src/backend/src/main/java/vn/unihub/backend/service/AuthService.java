package vn.unihub.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.dto.auth.AuthResponse;
import vn.unihub.backend.dto.auth.LoginRequest;
import vn.unihub.backend.dto.auth.RegisterRequest;
import vn.unihub.backend.entity.auth.Role;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.auth.UserRole;
import vn.unihub.backend.entity.auth.UserRoleId;
import vn.unihub.backend.repository.auth.RoleRepository;
import vn.unihub.backend.repository.auth.UserRepository;
import vn.unihub.backend.repository.auth.UserRoleRepository;
import vn.unihub.backend.repository.auth.RefreshTokenRepository;
import vn.unihub.backend.security.CustomUserDetails;
import vn.unihub.backend.security.JwtService;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        var user = User.builder()
                .fullName(request.getFirstName() + " " + request.getLastName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .status("ACTIVE")
                .build();

        var savedUser = userRepository.save(user);

        // Assign default role (STUDENT)
        Role studentRole = roleRepository.findByCode("STUDENT")
                .orElseThrow(() -> new RuntimeException("Default role not found"));

        UserRole userRole = UserRole.builder()
                .id(new UserRoleId(savedUser.getId(), studentRole.getId()))
                .user(savedUser)
                .role(studentRole)
                .build();
        userRoleRepository.save(userRole);

        var userDetails = new CustomUserDetails(savedUser);
        var jwtToken = jwtService.generateToken(userDetails);
        var refreshToken = createRefreshToken(savedUser);

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken)
                .email(savedUser.getEmail())
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        var user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        var userDetails = new CustomUserDetails(user);
        var jwtToken = jwtService.generateToken(userDetails);
        var refreshToken = createRefreshToken(user);

        String[] names = user.getFullName().split(" ", 2);
        String firstName = names.length > 0 ? names[0] : "";
        String lastName = names.length > 1 ? names[1] : "";

        return AuthResponse.builder()
                .token(jwtToken)
                .refreshToken(refreshToken)
                .email(user.getEmail())
                .firstName(firstName)
                .lastName(lastName)
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(String requestRefreshToken) {
        return refreshTokenRepository.findByTokenHash(requestRefreshToken)
                .map(token -> {
                    if (token.getExpiresAt().isBefore(java.time.Instant.now())) {
                        refreshTokenRepository.delete(token);
                        throw new RuntimeException("Refresh token was expired. Please make a new signin request");
                    }
                    if (token.getRevokedAt() != null) {
                        throw new RuntimeException("Refresh token was revoked");
                    }
                    
                    var user = token.getUser();
                    var userDetails = new CustomUserDetails(user);
                    var accessToken = jwtService.generateToken(userDetails);
                    return AuthResponse.builder()
                            .token(accessToken)
                            .refreshToken(requestRefreshToken)
                            .email(user.getEmail())
                            .build();
                })
                .orElseThrow(() -> new RuntimeException("Refresh token is not in database!"));
    }

    @Transactional
    public void logout(String requestRefreshToken) {
        refreshTokenRepository.findByTokenHash(requestRefreshToken)
                .ifPresent(token -> {
                    token.setRevokedAt(java.time.Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    private String createRefreshToken(User user) {
        // Clear old tokens for this user (optional, depending on strategy)
        // refreshTokenRepository.deleteByUser(user);

        String token = java.util.UUID.randomUUID().toString();
        var refreshToken = vn.unihub.backend.entity.auth.RefreshToken.builder()
                .user(user)
                .tokenHash(token)
                .expiresAt(java.time.Instant.now().plus(7, java.time.temporal.ChronoUnit.DAYS))
                .build();
        
        refreshTokenRepository.save(refreshToken);
        return token;
    }
}
