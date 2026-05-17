package vn.unihub.backend.controller;

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
import vn.unihub.backend.entity.payment.Payment;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.entity.student.Student;
import vn.unihub.backend.payment.PaymentService;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PaymentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User studentUser;
    private Student student;
    private Workshop paidWorkshop;
    private Registration pendingRegistrationNoPayment;
    private Registration pendingRegistrationReady;
    private Registration pendingRegistrationAwaitingStatus;
    private Registration cancelledRegistration;
    private Registration confirmedRegistration;
    private Payment readyPayment;
    private Payment pendingGatewayPayment;
    private Payment cancelledRegistrationPayment;
    private Payment succeededPayment;

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

        User organizerUser = entityManager.merge(User.builder()
                .email("organizer@unihub.local")
                .passwordHash(passwordEncoder.encode("secret"))
                .fullName("Organizer")
                .status("ACTIVE")
                .build());

        entityManager.persist(UserRole.builder().id(new UserRoleId(studentUser.getId(), studentRole.getId()))
                .user(studentUser).role(studentRole).build());
        entityManager.persist(UserRole.builder().id(new UserRoleId(organizerUser.getId(), organizerRole.getId()))
                .user(organizerUser).role(organizerRole).build());

        student = entityManager.merge(Student.builder()
                .user(studentUser)
                .studentCode("22110001")
                .fullName("Student One")
                .email("student1@unihub.local")
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
                .capacity(120)
                .build());

        Instant now = Instant.now();
        paidWorkshop = entityManager.merge(Workshop.builder()
                .event(event)
                .room(room)
                .title("Interview va mock interview")
                .description("Paid workshop")
                .capacity(10)
                .priceAmount(BigDecimal.valueOf(50000))
                .currency("VND")
                .status("PUBLISHED")
                .startTime(now.plus(5, ChronoUnit.DAYS))
                .endTime(now.plus(5, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS))
                .registrationOpensAt(now.minus(1, ChronoUnit.DAYS))
                .registrationClosesAt(now.plus(3, ChronoUnit.DAYS))
                .createdBy(organizerUser)
                .updatedBy(organizerUser)
                .build());

        pendingRegistrationNoPayment = entityManager.merge(Registration.builder()
                .student(student)
                .workshop(paidWorkshop)
                .status("PENDING_PAYMENT")
                .qrToken("qr-payment-no-row")
                .expiresAt(now.plusSeconds(900))
                .build());

        pendingRegistrationReady = entityManager.merge(Registration.builder()
                .student(student)
                .workshop(paidWorkshop)
                .status("PENDING_PAYMENT")
                .qrToken("qr-payment-ready")
                .expiresAt(now.plusSeconds(900))
                .build());

        pendingRegistrationAwaitingStatus = entityManager.merge(Registration.builder()
                .student(student)
                .workshop(paidWorkshop)
                .status("PENDING_PAYMENT")
                .qrToken("qr-payment-pending")
                .expiresAt(now.plusSeconds(900))
                .build());

        cancelledRegistration = entityManager.merge(Registration.builder()
                .student(student)
                .workshop(paidWorkshop)
                .status("CANCELLED")
                .qrToken("qr-payment-cancelled")
                .cancelledAt(now)
                .build());

        confirmedRegistration = entityManager.merge(Registration.builder()
                .student(student)
                .workshop(paidWorkshop)
                .status("CONFIRMED")
                .qrToken("qr-payment-success")
                .confirmedAt(now)
                .build());

        readyPayment = entityManager.merge(Payment.builder()
                .registration(pendingRegistrationReady)
                .idempotencyKey("PAY-" + pendingRegistrationReady.getId())
                .amount(BigDecimal.valueOf(50000))
                .currency("VND")
                .provider("MOCK_GATEWAY")
                .checkoutToken("chk-ready")
                .status(PaymentService.PAYMENT_STATUS_CHECKOUT_READY)
                .requestedAt(now)
                .build());

        pendingGatewayPayment = entityManager.merge(Payment.builder()
                .registration(pendingRegistrationAwaitingStatus)
                .idempotencyKey("PAY-" + pendingRegistrationAwaitingStatus.getId())
                .amount(BigDecimal.valueOf(50000))
                .currency("VND")
                .provider("MOCK_GATEWAY")
                .checkoutToken("chk-pending")
                .status(PaymentService.PAYMENT_STATUS_PENDING)
                .lastErrorMessage("Mock provider timed out while processing payment")
                .requestedAt(now)
                .build());

        cancelledRegistrationPayment = entityManager.merge(Payment.builder()
                .registration(cancelledRegistration)
                .idempotencyKey("PAY-" + cancelledRegistration.getId())
                .amount(BigDecimal.valueOf(50000))
                .currency("VND")
                .provider("MOCK_GATEWAY")
                .checkoutToken("chk-cancelled")
                .status(PaymentService.PAYMENT_STATUS_CHECKOUT_READY)
                .requestedAt(now)
                .build());

        succeededPayment = entityManager.merge(Payment.builder()
                .registration(confirmedRegistration)
                .idempotencyKey("PAY-" + confirmedRegistration.getId())
                .amount(BigDecimal.valueOf(50000))
                .currency("VND")
                .provider("MOCK_GATEWAY")
                .providerTransactionId("TXN-DEMO-1")
                .checkoutToken("chk-success")
                .status(PaymentService.PAYMENT_STATUS_SUCCEEDED)
                .requestedAt(now.minus(10, ChronoUnit.MINUTES))
                .paidAt(now.minus(9, ChronoUnit.MINUTES))
                .build());

        entityManager.flush();
        entityManager.clear();
    }

    @Test
    void openCheckout_createsPaymentIntentWhenMissing() throws Exception {
        mockMvc.perform(post("/api/v1/registrations/{registrationId}/payment/checkout", pendingRegistrationNoPayment.getId())
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationId").value(pendingRegistrationNoPayment.getId().toString()))
                .andExpect(jsonPath("$.paymentStatus").value("CHECKOUT_READY"))
                .andExpect(jsonPath("$.checkoutToken").isNotEmpty())
                .andExpect(jsonPath("$.checkoutUrl").isNotEmpty());
    }

    @Test
    void openCheckout_reusesExistingIntent() throws Exception {
        mockMvc.perform(post("/api/v1/registrations/{registrationId}/payment/checkout", pendingRegistrationReady.getId())
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentId").value(readyPayment.getId().toString()))
                .andExpect(jsonPath("$.checkoutToken").value("chk-ready"));
    }

    @Test
    void retryCheckout_rejectedWhilePaymentStillPending() throws Exception {
        mockMvc.perform(post("/api/v1/registrations/{registrationId}/payment/retry", pendingRegistrationAwaitingStatus.getId())
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isConflict());
    }

    @Test
    void paymentStatus_reconcilesPendingTimeoutAndAllowsRetry() throws Exception {
        mockMvc.perform(get("/api/v1/registrations/{registrationId}/payment/status", pendingRegistrationAwaitingStatus.getId())
                        .with(httpBasic("student1@unihub.local", "secret")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paymentStatus").value("TIMEOUT"))
                .andExpect(jsonPath("$.canRetry").value(true))
                .andExpect(jsonPath("$.canOpenCheckout").value(true));
    }

    @Test
    void mockProviderOutcome_duplicateResultDoesNotDowngradeSuccessfulPayment() throws Exception {
        mockMvc.perform(post("/api/v1/public/mock-payments/{checkoutToken}/result", succeededPayment.getCheckoutToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"outcome\":\"FAIL\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.registrationStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.paymentStatus").value("SUCCEEDED"));
    }

    @Test
    void mockProviderOutcome_rejectedAfterRegistrationCancelled() throws Exception {
        mockMvc.perform(post("/api/v1/public/mock-payments/{checkoutToken}/result", cancelledRegistrationPayment.getCheckoutToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"outcome\":\"SUCCESS\"}"))
                .andExpect(status().isConflict());
    }

    private void clearData() {
        entityManager.createQuery("delete from Payment").executeUpdate();
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
}
