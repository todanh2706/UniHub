package vn.unihub.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import vn.unihub.backend.entity.auth.Role;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.auth.UserRole;
import vn.unihub.backend.entity.auth.UserRoleId;
import vn.unihub.backend.entity.catalog.Event;
import vn.unihub.backend.entity.catalog.Room;
import vn.unihub.backend.entity.catalog.Workshop;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.entity.student.Student;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegistrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User studentUser;
    private User studentUser2;
    private User organizerUser;
    private Student student;
    private Student student2;
    private Workshop freeWorkshop;
    private Workshop paidWorkshop;
    private Registration existingRegistration;

    @BeforeEach
    void setUp() {
        clearData();

        Role studentRole = entityManager.merge(Role.builder().code("STUDENT").name("Student").build());
        Role organizerRole = entityManager.merge(Role.builder().code("ORGANIZER").name("Organizer").build());

        studentUser = entityManager.merge(User.builder()
                .email("student1@unihub.local")
                .passwordHash(passwordEncoder.encode("secret"))
                .fullName("Student One")
                .status("ACTIVE")
                .build());

        studentUser2 = entityManager.merge(User.builder()
                .email("student2@unihub.local")
                .passwordHash(passwordEncoder.encode("secret"))
                .fullName("Student Two")
                .status("ACTIVE")
                .build());

        organizerUser = entityManager.merge(User.builder()
                .email("organizer@unihub.local")
                .passwordHash(passwordEncoder.encode("secret"))
                .fullName("Organizer")
                .status("ACTIVE")
                .build());

        entityManager.persist(UserRole.builder().id(new UserRoleId(studentUser.getId(), studentRole.getId())).user(studentUser).role(studentRole).build());
        entityManager.persist(UserRole.builder().id(new UserRoleId(studentUser2.getId(), studentRole.getId())).user(studentUser2).role(studentRole).build());
        entityManager.persist(UserRole.builder().id(new UserRoleId(organizerUser.getId(), organizerRole.getId())).user(organizerUser).role(organizerRole).build());

        student = entityManager.merge(Student.builder()
                .user(studentUser)
                .studentCode("22110001")
                .fullName("Student One")
                .email("student1@unihub.local")
                .status("ACTIVE")
                .build());

        student2 = entityManager.merge(Student.builder()
                .user(studentUser2)
                .studentCode("22110002")
                .fullName("Student Two")
                .email("student2@unihub.local")
                .status("ACTIVE")
                .build());

        Event event = entityManager.merge(Event.builder()
                .name("Career Week")
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now().plusDays(7))
                .status("ACTIVE")
                .build());

        Room room = entityManager.merge(Room.builder()
                .name("A101")
                .building("A")
                .floor("1")
                .capacity(100)
                .build());

        Instant now = Instant.now();
        freeWorkshop = entityManager.merge(Workshop.builder()
                .event(event)
                .room(room)
                .title("Free workshop")
                .description("Free")
                .capacity(2)
                .priceAmount(BigDecimal.ZERO)
                .currency("VND")
                .status("PUBLISHED")
                .startTime(now.plus(3, ChronoUnit.DAYS))
                .endTime(now.plus(3, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .registrationOpensAt(now.minus(1, ChronoUnit.DAYS))
                .registrationClosesAt(now.plus(2, ChronoUnit.DAYS))
                .createdBy(organizerUser)
                .updatedBy(organizerUser)
                .build());

        paidWorkshop = entityManager.merge(Workshop.builder()
                .event(event)
                .room(room)
                .title("Paid workshop")
                .description("Paid")
                .capacity(10)
                .priceAmount(BigDecimal.valueOf(100000))
                .currency("VND")
                .status("PUBLISHED")
                .startTime(now.plus(4, ChronoUnit.DAYS))
                .endTime(now.plus(4, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .registrationOpensAt(now.minus(1, ChronoUnit.DAYS))
                .registrationClosesAt(now.plus(3, ChronoUnit.DAYS))
                .createdBy(organizerUser)
                .updatedBy(organizerUser)
                .build());

        existingRegistration = entityManager.merge(Registration.builder()
                .student(student2)
                .workshop(freeWorkshop)
                .status("CONFIRMED")
                .qrToken("qr-existing-1")
                .confirmedAt(now)
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void listWorkshopsAsStudent_success() throws Exception {
        mockMvc.perform(get("/api/v1/workshops")
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Free workshop"));
    }

    @Test
    void createRegistration_success() throws Exception {
        String body = objectMapper.writeValueAsString(new Request(freeWorkshop.getId()));
        mockMvc.perform(post("/api/v1/registrations")
                        .with(httpBasic("student1@unihub.local", "secret"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.workshopId").value(freeWorkshop.getId().toString()));
    }

    @Test
    void createRegistration_paidWorkshop_rejected() throws Exception {
        String body = objectMapper.writeValueAsString(new Request(paidWorkshop.getId()));
        mockMvc.perform(post("/api/v1/registrations")
                        .with(httpBasic("student1@unihub.local", "secret"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createRegistration_duplicate_rejected() throws Exception {
        String body = objectMapper.writeValueAsString(new Request(freeWorkshop.getId()));
        mockMvc.perform(post("/api/v1/registrations")
                        .with(httpBasic("student2@unihub.local", "secret"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    void getMyRegistrationDetail_success() throws Exception {
        mockMvc.perform(get("/api/v1/registrations/{registrationId}", existingRegistration.getId())
                        .with(httpBasic("student2@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existingRegistration.getId().toString()));
    }

    @Test
    void cancelMyRegistration_success() throws Exception {
        mockMvc.perform(delete("/api/v1/registrations/{registrationId}", existingRegistration.getId())
                        .with(httpBasic("student2@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    @Test
    void organizerListRegistrations_success() throws Exception {
        mockMvc.perform(get("/api/v1/organizer/workshops/{workshopId}/registrations", freeWorkshop.getId())
                        .with(httpBasic("organizer@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(existingRegistration.getId().toString()));
    }

    @Test
    void organizerSummary_success() throws Exception {
        mockMvc.perform(get("/api/v1/organizer/workshops/{workshopId}/registrations/summary", freeWorkshop.getId())
                        .with(httpBasic("organizer@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeCount").value(1));
    }

    @Test
    void studentCannotAccessOrganizerEndpoints_forbidden() throws Exception {
        mockMvc.perform(get("/api/v1/organizer/workshops/{workshopId}/registrations", freeWorkshop.getId())
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isForbidden());
    }

    private void clearData() {
        entityManager.createQuery("delete from Registration").executeUpdate();
        entityManager.createQuery("delete from Workshop").executeUpdate();
        entityManager.createQuery("delete from Room").executeUpdate();
        entityManager.createQuery("delete from Event").executeUpdate();
        entityManager.createQuery("delete from Student").executeUpdate();
        entityManager.createQuery("delete from UserRole").executeUpdate();
        entityManager.createQuery("delete from Role").executeUpdate();
        entityManager.createQuery("delete from User").executeUpdate();
        entityManager.flush();
    }

    private record Request(UUID workshopId) {}
}
