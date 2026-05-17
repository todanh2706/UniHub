package vn.unihub.backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.unihub.backend.dto.payment.MockProviderActionRequest;
import vn.unihub.backend.dto.payment.MockProviderResultResponse;
import vn.unihub.backend.dto.payment.MockProviderSessionResponse;
import vn.unihub.backend.dto.payment.PaymentCheckoutResponse;
import vn.unihub.backend.dto.payment.PaymentStatusResponse;
import vn.unihub.backend.dto.registration.CancelRegistrationResponse;
import vn.unihub.backend.dto.registration.OrganizerRegistrationSummaryResponse;
import vn.unihub.backend.dto.registration.RegistrationResponse;
import vn.unihub.backend.dto.registration.WorkshopDetailResponse;
import vn.unihub.backend.dto.registration.WorkshopListItemResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.catalog.Workshop;
import vn.unihub.backend.entity.payment.IdempotencyKey;
import vn.unihub.backend.entity.payment.Payment;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.entity.student.Student;
import vn.unihub.backend.idempotency.IdempotencyService;
import vn.unihub.backend.exception.IdempotencyConflictException;
import vn.unihub.backend.payment.PaymentService;
import vn.unihub.backend.repository.PaymentRepository;
import vn.unihub.backend.repository.catalog.WorkshopRepository;
import vn.unihub.backend.repository.registration.RegistrationRepository;
import vn.unihub.backend.repository.student.StudentRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Collection;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class RegistrationService {
    public static final String STATUS_CONFIRMED = "CONFIRMED";
    public static final String STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    public static final String STATUS_CANCELLED = "CANCELLED";
    public static final String STATUS_CHECKED_IN = "CHECKED_IN";
    private static final Set<String> ACTIVE_STATUSES = Set.of(STATUS_CONFIRMED, STATUS_PENDING_PAYMENT, STATUS_CHECKED_IN);

    private final WorkshopRepository workshopRepository;
    private final RegistrationRepository registrationRepository;
    private final StudentRepository studentRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final IdempotencyService idempotencyService;
    private final NotificationService notificationService;
    private final QrCodeCacheService qrCodeCacheService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RegistrationService(
            WorkshopRepository workshopRepository,
            RegistrationRepository registrationRepository,
            StudentRepository studentRepository,
            PaymentRepository paymentRepository,
            PaymentService paymentService,
            IdempotencyService idempotencyService,
            NotificationService notificationService,
            QrCodeCacheService qrCodeCacheService
    ) {
        this.workshopRepository = workshopRepository;
        this.registrationRepository = registrationRepository;
        this.studentRepository = studentRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
        this.idempotencyService = idempotencyService;
        this.notificationService = notificationService;
        this.qrCodeCacheService = qrCodeCacheService;
    }

    @Transactional(readOnly = true)
    public List<WorkshopListItemResponse> listPublishedWorkshops() {
        Instant now = Instant.now();
        return workshopRepository.findByStatusOrderByStartTimeAsc("PUBLISHED")
                .stream()
                .map(workshop -> toWorkshopListItem(workshop, now))
                .toList();
    }

    @Transactional(readOnly = true)
    public WorkshopDetailResponse getWorkshopDetail(UUID workshopId) {
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));
        Instant now = Instant.now();
        long activeSeats = registrationRepository.countActiveSeats(workshopId, now);
        long remainingSeats = Math.max(0L, workshop.getCapacity() - activeSeats);
        boolean registrable = isRegistrable(workshop, now, remainingSeats);
        return new WorkshopDetailResponse(
                workshop.getId(),
                workshop.getTitle(),
                workshop.getDescription(),
                workshop.getStatus(),
                workshop.getStartTime(),
                workshop.getEndTime(),
                workshop.getRegistrationOpensAt(),
                workshop.getRegistrationClosesAt(),
                workshop.getCapacity(),
                activeSeats,
                remainingSeats,
                registrable,
                workshop.getPriceAmount(),
                workshop.getCurrency(),
                workshop.getRoom().getId(),
                workshop.getRoom().getName(),
                workshop.getEvent().getId(),
                workshop.getEvent().getName()
        );
    }

    @Transactional
    public RegistrationResponse createRegistration(User user, UUID workshopId, String idempotencyKey) {
        if (workshopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workshopId is required");
        }

        // Idempotency check
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            try {
                IdempotencyService.CachedResult cachedResult = idempotencyService.getCachedResult(
                        idempotencyKey,
                        "/api/v1/registrations",
                        workshopId.toString()
                );
                if (cachedResult != null) {
                    return objectMapper.readValue(cachedResult.responseBody(), RegistrationResponse.class);
                }
            } catch (IdempotencyConflictException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Failed to replay idempotent response for key: {}", idempotencyKey);
            }
        }

        Student student = resolveActiveStudent(user);
        Workshop workshop = workshopRepository.findByIdForUpdate(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Instant now = Instant.now();
        if (!"PUBLISHED".equals(workshop.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workshop is not open for registration");
        }
        if (now.isBefore(workshop.getRegistrationOpensAt()) || now.isAfter(workshop.getRegistrationClosesAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration window is closed");
        }
        if (registrationRepository.existsActiveRegistration(student.getId(), workshopId, now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student already has an active registration");
        }
        if (registrationRepository.hasTimeOverlap(student.getId(), workshop.getStartTime(), workshop.getEndTime(), now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student already has an overlapping workshop registration");
        }

        long activeSeats = registrationRepository.countActiveSeats(workshopId, now);
        if (activeSeats >= workshop.getCapacity()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Workshop is full");
        }

        boolean isPaid = workshop.getPriceAmount().compareTo(BigDecimal.ZERO) > 0;

        // Reserve idempotency key before creating registration
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.reserve(idempotencyKey, user,
                    "/api/v1/registrations", workshopId.toString());
        }

        Registration registration;
        if (isPaid) {
            registration = Registration.builder()
                    .student(student)
                    .workshop(workshop)
                    .status(STATUS_PENDING_PAYMENT)
                    .qrToken("qr_" + UUID.randomUUID())
                    .expiresAt(now.plusSeconds(900)) // 15-minute hold
                    .build();
        } else {
            registration = Registration.builder()
                    .student(student)
                    .workshop(workshop)
                    .status(STATUS_CONFIRMED)
                    .qrToken("qr_" + UUID.randomUUID())
                    .confirmedAt(now)
                    .build();
        }

        Registration saved = registrationRepository.save(registration);
        
        if (!isPaid) {
            notificationService.sendRegistrationConfirmation(saved);
        }

        // For paid workshops, create or reuse a stable payment intent.
        if (isPaid) {
            paymentService.createOrReusePaymentIntent(saved);
        }

        RegistrationResponse response = toRegistrationResponse(saved);

        // Complete idempotency
        if (idempotencyKey != null && !idempotencyKey.isBlank()) {
            idempotencyService.complete(idempotencyKey, response, 201);
        }

        return response;
    }

    @Transactional(readOnly = true)
    public List<RegistrationResponse> listMyRegistrations(User user) {
        Student student = resolveActiveStudent(user);
        return registrationRepository.findByStudentIdOrderByCreatedAtDesc(student.getId())
                .stream()
                .map(this::toRegistrationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public RegistrationResponse getMyRegistrationDetail(User user, UUID registrationId) {
        Registration registration = findOwnedRegistration(user, registrationId);
        return toRegistrationResponse(registration);
    }

    @Transactional
    public PaymentCheckoutResponse openPaymentCheckout(User user, UUID registrationId) {
        Registration registration = findPendingPaymentRegistration(user, registrationId);
        Payment payment = paymentService.createOrReusePaymentIntent(registration);
        return toPaymentCheckoutResponse(registration, payment);
    }

    @Transactional
    public PaymentCheckoutResponse retryPayment(User user, UUID registrationId) {
        Registration registration = findPendingPaymentRegistration(user, registrationId);
        Payment payment = paymentService.createOrReusePaymentIntent(registration);
        return toPaymentCheckoutResponse(registration, payment);
    }

    @Transactional(readOnly = true)
    public PaymentStatusResponse getPaymentStatus(User user, UUID registrationId) {
        Registration registration = findOwnedRegistration(user, registrationId);
        Payment payment = paymentService.getPaymentIntent(registration);
        payment = paymentService.reconcilePendingPayment(payment);
        return toPaymentStatusResponse(registration, payment);
    }

    @Transactional(readOnly = true)
    public MockProviderSessionResponse getMockProviderSession(String checkoutToken) {
        Payment payment = paymentService.getPaymentIntentByCheckoutToken(checkoutToken);
        return new MockProviderSessionResponse(
                payment.getRegistration().getId(),
                payment.getRegistration().getWorkshop().getTitle(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getCheckoutToken()
        );
    }

    @Transactional
    public MockProviderResultResponse applyMockProviderOutcome(String checkoutToken,
                                                              MockProviderActionRequest request) {
        Payment payment = paymentService.getPaymentIntentByCheckoutToken(checkoutToken);
        Registration registration = payment.getRegistration();
        String outcome = request.outcome() == null ? "" : request.outcome().trim().toUpperCase(Locale.ROOT);

        if (paymentService.isSuccessful(payment) || STATUS_CONFIRMED.equals(registration.getStatus())) {
            return new MockProviderResultResponse(
                    registration.getId(),
                    STATUS_CONFIRMED,
                    PaymentService.PAYMENT_STATUS_SUCCEEDED,
                    "/my-registrations"
            );
        }
        if (STATUS_CANCELLED.equals(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration was cancelled before payment completed");
        }

        switch (outcome) {
            case "SUCCESS" -> {
                payment.setStatus(PaymentService.PAYMENT_STATUS_SUCCEEDED);
                payment.setLastErrorMessage(null);
                if (payment.getProviderTransactionId() == null || payment.getProviderTransactionId().isBlank()) {
                    payment.setProviderTransactionId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
                }
                payment.setPaidAt(Instant.now());
                registration.setStatus(STATUS_CONFIRMED);
                registration.setConfirmedAt(Instant.now());
                registration.setExpiresAt(null);
                registrationRepository.save(registration);
                notificationService.sendRegistrationConfirmation(registration);
            }
            case "FAIL" -> {
                payment.setStatus(PaymentService.PAYMENT_STATUS_FAILED);
                payment.setLastErrorMessage("Mock provider rejected the payment");
            }
            case "TIMEOUT" -> {
                payment.setStatus(PaymentService.PAYMENT_STATUS_PENDING);
                payment.setLastErrorMessage("Mock provider timed out while processing payment");
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported mock payment outcome");
        }

        paymentRepository.save(payment);
        return new MockProviderResultResponse(
                registration.getId(),
                registration.getStatus(),
                payment.getStatus(),
                "/my-registrations"
        );
    }

    /**
     * Get the QR code image bytes for a registration using its secret token.
     *
     * @param qrToken the secret QR token
     * @return PNG image bytes
     */
    @Transactional(readOnly = true)
    public byte[] getQrCodeImageByToken(String qrToken) {
        Registration registration = registrationRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        String qrPayload = "/api/v1/checkins/qr/" + registration.getQrToken();
        return qrCodeCacheService.getOrGenerateQrCode(registration.getId(), qrPayload);
    }

    /**
     * Get the QR code image bytes for a registration.
     *
     * @param registrationId the registration ID
     * @return PNG image bytes
     */
    @Transactional(readOnly = true)
    public byte[] getQrCodeImage(UUID registrationId) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        String qrPayload = "/api/v1/checkins/qr/" + registration.getQrToken();
        return qrCodeCacheService.getOrGenerateQrCode(registrationId, qrPayload);
    }

    @Transactional
    public CancelRegistrationResponse cancelMyRegistration(User user, UUID registrationId) {
        Registration registration = findOwnedRegistration(user, registrationId);

        if (!ACTIVE_STATUSES.contains(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Registration is not active");
        }
        if (!workshopRepository.startsInFuture(registration.getWorkshop().getId(), Instant.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel after workshop start time");
        }

        registration.setStatus(STATUS_CANCELLED);
        registration.setCancelledAt(Instant.now());
        registration.setCancelledBy(user);
        registration.setCancelReason("Cancelled by student");
        Registration saved = registrationRepository.save(registration);
        return new CancelRegistrationResponse(saved.getId(), saved.getStatus(), saved.getCancelledAt());
    }

    @Transactional(readOnly = true)
    public Page<vn.unihub.backend.dto.registration.OrganizerAttendeeResponse> listOrganizerAttendeesByWorkshop(UUID workshopId, String status, int page, int size) {
        workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Pageable pageable = PageRequest.of(page, size);
        Collection<String> statuses = normalizeStatusFilter(status);
        return registrationRepository.findOrganizerAttendeesByWorkshop(workshopId, statuses, pageable);
    }

    @Transactional
    public RegistrationResponse updateRegistrationStatus(UUID registrationId, String newStatus, User currentUser) {
        Registration registration = registrationRepository.findById(registrationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));

        registration.setStatus(newStatus.toUpperCase());
        if ("CANCELLED".equalsIgnoreCase(newStatus)) {
            registration.setCancelledAt(Instant.now());
            registration.setCancelledBy(currentUser);
        } else if ("CONFIRMED".equalsIgnoreCase(newStatus)) {
            registration.setConfirmedAt(Instant.now());
            notificationService.sendRegistrationConfirmation(registration);
        }
        
        Registration saved = registrationRepository.save(registration);
        return toRegistrationResponse(saved);
    }

    @Transactional(readOnly = true)
    public OrganizerRegistrationSummaryResponse getWorkshopRegistrationSummary(UUID workshopId) {
        Workshop workshop = workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Instant now = Instant.now();
        long confirmed = registrationRepository.findByWorkshopAndOptionalStatus(workshopId, List.of(STATUS_CONFIRMED), PageRequest.of(0, 1)).getTotalElements();
        long pending = registrationRepository.findByWorkshopAndOptionalStatus(workshopId, List.of(STATUS_PENDING_PAYMENT), PageRequest.of(0, 1)).getTotalElements();
        long active = registrationRepository.countActiveSeats(workshopId, now);
        long remaining = Math.max(0L, workshop.getCapacity() - active);

        return new OrganizerRegistrationSummaryResponse(
                workshopId,
                workshop.getCapacity(),
                confirmed,
                pending,
                active,
                remaining
        );
    }

    private Registration findOwnedRegistration(User user, UUID registrationId) {
        Student student = resolveActiveStudent(user);
        return registrationRepository.findByIdAndStudentId(registrationId, student.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
    }

    private Registration findPendingPaymentRegistration(User user, UUID registrationId) {
        Registration registration = findOwnedRegistration(user, registrationId);
        if (!STATUS_PENDING_PAYMENT.equals(registration.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Registration is not awaiting payment");
        }
        if (registration.getExpiresAt() != null && registration.getExpiresAt().isBefore(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Payment window has expired");
        }
        return registration;
    }

    private Student resolveActiveStudent(User user) {
        return studentRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    log.info("Auto-creating student profile for user: {}", user.getEmail());
                    Student newStudent = Student.builder()
                            .user(user)
                            .studentCode("GUEST_" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                            .fullName(user.getFullName())
                            .email(user.getEmail())
                            .status("ACTIVE")
                            .build();
                    return studentRepository.save(newStudent);
                });
    }

    private WorkshopListItemResponse toWorkshopListItem(Workshop workshop, Instant now) {
        long activeSeats = registrationRepository.countActiveSeats(workshop.getId(), now);
        long remainingSeats = Math.max(0L, workshop.getCapacity() - activeSeats);
        return new WorkshopListItemResponse(
                workshop.getId(),
                workshop.getTitle(),
                workshop.getDescription(),
                workshop.getStartTime(),
                workshop.getEndTime(),
                workshop.getStatus(),
                workshop.getPriceAmount(),
                workshop.getCurrency(),
                workshop.getCapacity(),
                activeSeats,
                remainingSeats,
                isRegistrable(workshop, now, remainingSeats),
                workshop.getRegistrationOpensAt(),
                workshop.getRegistrationClosesAt()
        );
    }

    private RegistrationResponse toRegistrationResponse(Registration registration) {
        String payload = "/api/v1/checkins/qr/" + registration.getQrToken();
        Payment payment = paymentService.getPaymentIntent(registration);
        boolean pendingRegistration = STATUS_PENDING_PAYMENT.equals(registration.getStatus());
        boolean canOpenCheckout = pendingRegistration && (payment == null || paymentService.canReopenCheckout(payment));
        boolean canRetryPayment = payment != null && canOpenCheckout && paymentService.isRetryableStatus(payment.getStatus());
        boolean canCheckPaymentStatus = pendingRegistration && (payment == null || !paymentService.isSuccessful(payment));

        return new RegistrationResponse(
                registration.getId(),
                registration.getWorkshop().getId(),
                registration.getWorkshop().getTitle(),
                registration.getStatus(),
                registration.getQrToken(),
                payload,
                registration.getCreatedAt(),
                registration.getConfirmedAt(),
                registration.getCancelledAt(),
                registration.getWorkshop().getStartTime(),
                registration.getWorkshop().getEndTime(),
                payment != null ? payment.getStatus() : null,
                registration.getExpiresAt(),
                canOpenCheckout,
                canRetryPayment,
                canCheckPaymentStatus
        );
    }

    private PaymentCheckoutResponse toPaymentCheckoutResponse(Registration registration, Payment payment) {
        return new PaymentCheckoutResponse(
                registration.getId(),
                payment.getId(),
                registration.getStatus(),
                payment.getStatus(),
                payment.getCheckoutToken(),
                paymentService.buildMockCheckoutUrl(payment.getCheckoutToken()),
                registration.getExpiresAt(),
                payment.getRequestedAt()
        );
    }

    private PaymentStatusResponse toPaymentStatusResponse(Registration registration, Payment payment) {
        if (payment == null) {
            return new PaymentStatusResponse(
                    registration.getId(),
                    null,
                    registration.getStatus(),
                    null,
                    null,
                    null,
                    registration.getExpiresAt(),
                    null,
                    null,
                    STATUS_PENDING_PAYMENT.equals(registration.getStatus()),
                    false,
                    STATUS_PENDING_PAYMENT.equals(registration.getStatus())
            );
        }

        boolean pendingRegistration = STATUS_PENDING_PAYMENT.equals(registration.getStatus());
        boolean canOpenCheckout = pendingRegistration && paymentService.canReopenCheckout(payment);
        boolean canRetry = canOpenCheckout && paymentService.isRetryableStatus(payment.getStatus());
        boolean canCheckStatus = pendingRegistration && !paymentService.isSuccessful(payment);
        return new PaymentStatusResponse(
                registration.getId(),
                payment.getId(),
                registration.getStatus(),
                payment.getStatus(),
                payment.getCheckoutToken(),
                paymentService.buildMockCheckoutUrl(payment.getCheckoutToken()),
                registration.getExpiresAt(),
                payment.getRequestedAt(),
                payment.getPaidAt(),
                canOpenCheckout,
                canRetry,
                canCheckStatus
        );
    }

    private boolean isRegistrable(Workshop workshop, Instant now, long remainingSeats) {
        return "PUBLISHED".equals(workshop.getStatus())
                && workshop.getPriceAmount().compareTo(BigDecimal.ZERO) == 0
                && !now.isBefore(workshop.getRegistrationOpensAt())
                && !now.isAfter(workshop.getRegistrationClosesAt())
                && remainingSeats > 0;
    }

    private Collection<String> normalizeStatusFilter(String status) {
        if (status == null || status.isBlank()) {
            return ACTIVE_STATUSES;
        }
        return List.of(status.trim().toUpperCase());
    }
}
