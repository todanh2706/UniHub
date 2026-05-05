package vn.unihub.backend.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/test-rbac")
public class TestRbacController {

    @GetMapping("/public")
    public String publicAccess() {
        return "Thành công! API này ai cũng truy cập được (Public).";
    }

    @GetMapping("/user")
    @PreAuthorize("isAuthenticated()")
    public String userAccess() {
        return "Thành công! Bạn đã đăng nhập hợp lệ.";
    }

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public String adminAccess() {
        return "Thành công! Bạn có ROLE_ADMIN.";
    }

    @GetMapping("/workshop")
    @PreAuthorize("hasAuthority('WORKSHOP_CREATE')")
    public String workshopAccess() {
        return "Thành công! Bạn có quyền WORKSHOP_CREATE.";
    }
}
