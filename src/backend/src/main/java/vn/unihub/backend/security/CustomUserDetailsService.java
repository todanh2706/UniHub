package vn.unihub.backend.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import vn.unihub.backend.entity.auth.Permission;
import vn.unihub.backend.entity.auth.Role;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.repository.auth.PermissionRepository;
import vn.unihub.backend.repository.auth.RoleRepository;
import vn.unihub.backend.repository.auth.UserRepository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    public CustomUserDetailsService(UserRepository userRepository, RoleRepository roleRepository, PermissionRepository permissionRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.permissionRepository = permissionRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + username));

        List<Role> roles = roleRepository.findRolesByUserId(user.getId());
        List<Permission> permissions = permissionRepository.findPermissionsByUserId(user.getId());

        Set<GrantedAuthority> authorities = new HashSet<>();
        
        // Add roles as authorities (usually prefixed with ROLE_)
        authorities.addAll(roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode().toUpperCase()))
                .collect(Collectors.toSet()));

        // Add permissions as authorities
        authorities.addAll(permissions.stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getCode().toUpperCase()))
                .collect(Collectors.toSet()));

        return new CustomUserDetails(user, authorities);
    }
}
