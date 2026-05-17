package vn.unihub.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import vn.unihub.backend.dto.catalog.WorkshopResponse;
import vn.unihub.backend.service.WorkshopService;
import vn.unihub.backend.service.ai.AiSummaryService;
import vn.unihub.backend.dto.ai.AiSummaryResponse;

import java.util.UUID;


@RestController
@RequestMapping("/api/v1/public/workshops")
@RequiredArgsConstructor
public class StudentWorkshopController {
    private final WorkshopService workshopService;
    private final AiSummaryService aiSummaryService;

    @GetMapping
    public ResponseEntity<Page<WorkshopResponse>> getPublicWorkshops(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(workshopService.getPublicWorkshops(keyword, status, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkshopResponse> getWorkshopDetail(@PathVariable UUID id) {
        return ResponseEntity.ok(workshopService.getWorkshopById(id));
    }

    @GetMapping("/{id}/summary")
    public ResponseEntity<AiSummaryResponse> getWorkshopSummary(@PathVariable UUID id) {
        AiSummaryResponse summary = aiSummaryService.getLatestSummary(id);
        if (summary == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(summary);
    }
}

