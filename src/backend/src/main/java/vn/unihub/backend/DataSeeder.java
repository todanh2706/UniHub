package vn.unihub.backend;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import vn.unihub.backend.entity.auth.Permission;
import vn.unihub.backend.entity.auth.Role;
import vn.unihub.backend.entity.auth.RolePermission;
import vn.unihub.backend.entity.auth.RolePermissionId;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.auth.UserRole;
import vn.unihub.backend.entity.auth.UserRoleId;
import vn.unihub.backend.repository.auth.PermissionRepository;
import vn.unihub.backend.repository.auth.RoleRepository;
import vn.unihub.backend.repository.auth.UserRepository;

// Bạn có thể xóa class này sau khi đã test xong
@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner initData(UserRepository userRepository, 
                                      RoleRepository roleRepository, 
                                      PermissionRepository permissionRepository, 
                                      PasswordEncoder passwordEncoder) {
        return args -> {
            // Chỉ tạo data nếu DB đang trống
            if (userRepository.count() == 0) {
                
                // 1. Tạo Permission
                Permission pCreateWorkshop = Permission.builder()
                        .code("WORKSHOP_CREATE")
                        .description("Tạo mới workshop")
                        .build();
                permissionRepository.save(pCreateWorkshop);

                // 2. Tạo Role
                Role rAdmin = Role.builder()
                        .code("ADMIN")
                        .name("Quản trị viên")
                        .build();
                roleRepository.save(rAdmin);

                Role rStudent = Role.builder()
                        .code("STUDENT")
                        .name("Sinh viên")
                        .build();
                roleRepository.save(rStudent);

                Role rLecturer = Role.builder()
                        .code("LECTURER")
                        .name("Giảng viên")
                        .build();
                roleRepository.save(rLecturer);

                // Gắn Permission cho Role (Vì chưa có Repository riêng cho RolePermission nên tạm dùng logic này hoặc viết native SQL)
                // Tuy nhiên do chưa có RolePermissionRepository, ở đây tôi tạo tạm User cho việc test RBAC.
                
                // 3. Tạo User
                User adminUser = User.builder()
                        .email("admin@unihub.vn")
                        .passwordHash(passwordEncoder.encode("123456"))
                        .fullName("Admin Test")
                        .status("ACTIVE")
                        .build();
                userRepository.save(adminUser);

                // (Lưu ý: Để test phân quyền thực tế, bạn cần insert tay hoặc tạo RolePermissionRepository/UserRoleRepository
                // để gán role ADMIN và quyền WORKSHOP_CREATE cho user này nhé)
                System.out.println("=========================================");
                System.out.println("Tạo tài khoản test thành công!");
                System.out.println("Email: admin@unihub.vn");
                System.out.println("Mật khẩu: 123456");
                System.out.println("=========================================");
            }
        };
    }
}
