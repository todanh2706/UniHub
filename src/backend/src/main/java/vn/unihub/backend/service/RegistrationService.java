package vn.unihub.backend.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.unihub.backend.dto.registration.CancelRegistrationResponse;
import vn.unihub.backend.dto.registration.OrganizerRegistrationSummaryResponse;
import vn.unihub.backend.dto.registration.RegistrationResponse;
import vn.unihub.backend.dto.registration.WorkshopDetailResponse;
import vn.unihub.backend.dto.registration.WorkshopListItemResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.catalog.Workshop;
import vn.unihub.backend.entity.registration.Registration;
import vn.unihub.backend.entity.student.Student;
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
public class RegistrationService {
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";
    private static final String STATUS_CANCELLED = "CANCELLED";
    private static final Set<String> ACTIVE_STATUSES = Set.of(STATUS_CONFIRMED, STATUS_PENDING_PAYMENT);

    private final WorkshopRepository workshopRepository;
    private final RegistrationRepository registrationRepository;
    private final StudentRepository studentRepository;

    public RegistrationService(
            WorkshopRepository workshopRepository,
            RegistrationRepository registrationRepository,
            StudentRepository studentRepository
    ) {
        this.workshopRepository = workshopRepository;
        this.registrationRepository = registrationRepository;
        this.studentRepository = studentRepository;
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
    public RegistrationResponse createRegistration(User user, UUID workshopId) {
        if (workshopId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "workshopId is required");
        }
        Student student = resolveActiveStudent(user);
        Workshop workshop = workshopRepository.findByIdForUpdate(workshopId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Instant now = Instant.now();
        if (!"PUBLISHED".equals(workshop.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Workshop is not open for registration");
        }
        if (workshop.getPriceAmount().compareTo(BigDecimal.ZERO) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paid workshops are not supported in this phase");
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

        Registration registration = Registration.builder()
                .student(student)
                .workshop(workshop)
                .status(STATUS_CONFIRMED)
                .qrToken("qr_" + UUID.randomUUID())
                .confirmedAt(now)
                .build();
        Registration saved = registrationRepository.save(registration);
        return toRegistrationResponse(saved);
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
