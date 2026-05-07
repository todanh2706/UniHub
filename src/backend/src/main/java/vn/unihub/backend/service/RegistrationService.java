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
import vn.unihub.backend.circuitbreaker.CircuitBreakerService;
import vn.unihub.backend.circuitbreaker.CircuitBreakerService;
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
import vn.unihub.backend.payment.PaymentService;
import vn.unihub.backend.repository.PaymentRepository;
import vn.unihub.backend.repository.catalog.WorkshopRepository;
import vn.unihub.backend.repository.registration.RegistrationRepository;
import vn.unihub.backend.repository.student.StudentRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class RegistrationService {
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final Set<String> ACTIVE_STATUSES = Set.of(STATUS_CONFIRMED, STATUS_PENDING_PAYMENT);

    private final WorkshopRepository workshopRepository;
    private final RegistrationRepository registrationRepository;
    private final StudentRepository studentRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentService paymentService;
    private final IdempotencyService idempotencyService;
    private final ObjectMapper objectMapper;

    public RegistrationService(
            WorkshopRepository workshopRepository,
            RegistrationRepository registrationRepository,
            StudentRepository studentRepository,
            PaymentRepository paymentRepository,
            PaymentService paymentService,
            IdempotencyService idempotencyService,
            ObjectMapper objectMapper
    ) {
        this.workshopRepository = workshopRepository;
        this.registrationRepository = registrationRepository;
        this.studentRepository = studentRepository;
        this.paymentRepository = paymentRepository;
        this.paymentService = paymentService;
        this.idempotencyService = idempotencyService;
        this.objectMapper = objectMapper;
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
            // Check if already completed
            String cached = idempotencyService.getCachedResponse(idempotencyKey);
            if (cached != null && !"IN_PROGRESS".equals(cached)) {
                try {
                    return objectMapper.readValue(cached, RegistrationResponse.class);
                } catch (Exception e) {
                    log.warn("Failed to replay idempotent response for key: {}", idempotencyKey);
                }
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
        if (registrationRepository.existsByStudentAndWorkshopAndStatuses(student.getId(), workshopId, ACTIVE_STATUSES)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Student already has an active registration");
        }
        if (registrationRepository.hasTimeOverlap(student.getId(), workshop.getStartTime(), workshop.getEndTime(), ACTIVE_STATUSES)) {
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

        // For paid workshops, initiate payment through circuit breaker
        if (isPaid) {
            try {
                Payment payment = paymentService.initiatePayment(saved);
                paymentRepository.save(payment);
                
                if ("SUCCEEDED".equals(payment.getStatus())) {
                    saved.setStatus(STATUS_CONFIRMED);
                    saved.setConfirmedAt(now);
                    saved.setExpiresAt(null);
                    saved = registrationRepository.save(saved);
                }
            } catch (CircuitBreakerService.PaymentGatewayUnavailableException e) {
                // Payment gateway unavailable - registration stays PENDING_PAYMENT
                // Registration will expire in 15 minutes via worker
                log.warn("Payment gateway unavailable for registration: {}", saved.getId());
            }
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
        Student student = resolveActiveStudent(user);
        Registration registration = registrationRepository.findByIdAndStudentId(registrationId, student.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));
        return toRegistrationResponse(registration);
    }

    @Transactional
    public CancelRegistrationResponse cancelMyRegistration(User user, UUID registrationId) {
        Student student = resolveActiveStudent(user);
        Registration registration = registrationRepository.findByIdAndStudentId(registrationId, student.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Registration not found"));

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
    public Page<RegistrationResponse> listRegistrationsByWorkshop(UUID workshopId, String status, int page, int size) {
        workshopRepository.findById(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Pageable pageable = PageRequest.of(page, size);
        Collection<String> statuses = normalizeStatusFilter(status);
        return registrationRepository.findByWorkshopAndOptionalStatus(workshopId, statuses, pageable)
                .map(this::toRegistrationResponse);
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

    private Student resolveActiveStudent(User user) {
        Student student = studentRepository.findByUserId(user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Student profile is required"));
        if (!"ACTIVE".equals(student.getStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is not active");
        }
        return student;
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
                registration.getWorkshop().getEndTime()
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
