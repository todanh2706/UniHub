package vn.unihub.backend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import vn.unihub.backend.dto.catalog.WorkshopRequest;
import vn.unihub.backend.dto.catalog.WorkshopResponse;
import vn.unihub.backend.entity.auth.User;
import vn.unihub.backend.entity.catalog.Event;
import vn.unihub.backend.entity.catalog.Room;
import vn.unihub.backend.entity.catalog.Workshop;
import vn.unihub.backend.repository.catalog.EventRepository;
import vn.unihub.backend.repository.catalog.RoomRepository;
import vn.unihub.backend.repository.catalog.WorkshopRepository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkshopService {
    private final WorkshopRepository workshopRepository;
    private final EventRepository eventRepository;
    private final RoomRepository roomRepository;

    @Transactional(readOnly = true)
    public List<Event> getAllEvents() {
        return eventRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Transactional(readOnly = true)
    public List<WorkshopResponse> getAllWorkshops() {
        return workshopRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WorkshopResponse getWorkshopById(UUID id) {
        Workshop workshop = workshopRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));
        return mapToResponse(workshop);
    }

    @Transactional
    public WorkshopResponse createWorkshop(WorkshopRequest request, User currentUser) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        Workshop workshop = Workshop.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .event(event)
                .room(room)
                .capacity(request.getCapacity())
                .priceAmount(request.getPriceAmount())
                .currency(request.getCurrency())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .registrationOpensAt(request.getRegistrationOpensAt())
                .registrationClosesAt(request.getRegistrationClosesAt())
                .status(request.getStatus())
                .createdBy(currentUser)
                .build();

        return mapToResponse(workshopRepository.save(workshop));
    }

    @Transactional
    public WorkshopResponse updateWorkshop(UUID id, WorkshopRequest request, User currentUser) {
        Workshop workshop = workshopRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));

        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Event not found"));
        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        workshop.setTitle(request.getTitle());
        workshop.setDescription(request.getDescription());
        workshop.setEvent(event);
        workshop.setRoom(room);
        workshop.setCapacity(request.getCapacity());
        workshop.setPriceAmount(request.getPriceAmount());
        workshop.setCurrency(request.getCurrency());
        workshop.setStartTime(request.getStartTime());
        workshop.setEndTime(request.getEndTime());
        workshop.setRegistrationOpensAt(request.getRegistrationOpensAt());
        workshop.setRegistrationClosesAt(request.getRegistrationClosesAt());
        workshop.setStatus(request.getStatus());
        workshop.setUpdatedBy(currentUser);

        return mapToResponse(workshopRepository.save(workshop));
    }

    @Transactional
    public void deleteWorkshop(UUID id) {
        Workshop workshop = workshopRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Workshop not found"));
        
        // Soft delete is handled by @SQLDelete in entity, but we can set status to CANCELLED first if needed
        workshop.setStatus("CANCELLED");
        workshopRepository.delete(workshop);
    }

    private WorkshopResponse mapToResponse(Workshop workshop) {
        return WorkshopResponse.builder()
                .id(workshop.getId())
                .title(workshop.getTitle())
                .description(workshop.getDescription())
                .eventId(workshop.getEvent().getId())
                .eventName(workshop.getEvent().getName())
                .roomId(workshop.getRoom().getId())
                .roomName(workshop.getRoom().getName())
                .capacity(workshop.getCapacity())
                .priceAmount(workshop.getPriceAmount())
                .currency(workshop.getCurrency())
                .status(workshop.getStatus())
                .startTime(workshop.getStartTime())
                .endTime(workshop.getEndTime())
                .registrationOpensAt(workshop.getRegistrationOpensAt())
                .registrationClosesAt(workshop.getRegistrationClosesAt())
                .build();
    }
}
