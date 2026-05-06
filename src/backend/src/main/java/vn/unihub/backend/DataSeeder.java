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
import vn.unihub.backend.entity.catalog.Event;
import vn.unihub.backend.entity.catalog.Room;
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
                        vn.unihub.backend.repository.catalog.EventRepository eventRepository,
                        vn.unihub.backend.repository.catalog.RoomRepository roomRepository,
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

                                Permission pUpdateWorkshop = Permission.builder()
                                                .code("WORKSHOP_UPDATE")
                                                .description("Sửa workshop")
                                                .build();
                                permissionRepository.save(pUpdateWorkshop);

                                Permission pDeleteWorkshop = Permission.builder()
                                                .code("WORKSHOP_DELETE")
                                                .description("Xóa/Hủy workshop")
                                                .build();
                                permissionRepository.save(pDeleteWorkshop);

                                Permission pManageReg = Permission.builder()
                                                .code("WORKSHOP_MANAGE")
                                                .description("Quản lý danh sách đăng ký")
                                                .build();
                                permissionRepository.save(pManageReg);

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

                                Role rOrganizer = Role.builder()
                                                .code("ORGANIZER")
                                                .name("Ban tổ chức")
                                                .build();
                                roleRepository.save(rOrganizer);

                                Role rLecturer = Role.builder()
                                                .code("LECTURER")
                                                .name("Giảng viên")
                                                .build();
                                roleRepository.save(rLecturer);

                                // 2b. Tạo Event & Room mẫu
                                Event defaultEvent = Event.builder()
                                                .name("UniHub Spring Workshop 2026")
                                                .startDate(java.time.LocalDate.now())
                                                .endDate(java.time.LocalDate.now().plusMonths(1))
                                                .status("ACTIVE")
                                                .build();
                                eventRepository.save(defaultEvent);

                                Room defaultRoom = Room.builder()
                                                .name("Phòng 401 - Tòa A")
                                                .building("Tòa A")
                                                .floor("4")
                                                .capacity(50)
                                                .build();
                                roomRepository.save(defaultRoom);

                                // 3. Tạo User
                                User adminUser = User.builder()
                                                .email("admin@unihub.vn")
                                                .passwordHash(passwordEncoder.encode("123456"))
                                                .fullName("Admin Test")
                                                .status("ACTIVE")
                                                .build();
                                userRepository.save(adminUser);

                                User organizerUser = User.builder()
                                                .email("organizer@unihub.vn")
                                                .passwordHash(passwordEncoder.encode("123456"))
                                                .fullName("Organizer Test")
                                                .status("ACTIVE")
                                                .build();
                                userRepository.save(organizerUser);

                                System.out.println("=========================================");
                                System.out.println("Tạo tài khoản test thành công!");
                                System.out.println("Admin: admin@unihub.vn / 123456");
                                System.out.println("Organizer: organizer@unihub.vn / 123456");
                                System.out.println("=========================================");
                        }
                };
        }
}
