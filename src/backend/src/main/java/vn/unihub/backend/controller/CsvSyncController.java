package vn.unihub.backend.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.unihub.backend.dto.student.CsvJobResponse;
import vn.unihub.backend.entity.student.CsvImportError;
import vn.unihub.backend.entity.student.CsvImportJob;
import vn.unihub.backend.service.CsvSyncService;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/csv-sync")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")
public class CsvSyncController {

    private final CsvSyncService csvSyncService;

    @PostMapping("/trigger")
    public ResponseEntity<Map<String, Object>> triggerSync() {
        CompletableFuture<UUID> future = csvSyncService.triggerSync();
        UUID jobId = future.join();
        if (jobId == null) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "SYNC_IN_PROGRESS",
                            "message", "A CSV sync is already in progress"));
        }
        return ResponseEntity.accepted()
                .body(Map.of("jobId", jobId));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobStatus(@PathVariable UUID jobId) {
        return csvSyncService.getJobStatus(jobId)
                .map(job -> ResponseEntity.ok(toResponse(job)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<CsvJobResponse>> listJobs() {
        List<CsvImportJob> jobs = csvSyncService.listJobs();
        List<CsvJobResponse> responses = jobs.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/jobs/{jobId}/errors")
    public ResponseEntity<List<CsvImportError>> getJobErrors(@PathVariable UUID jobId) {
        List<CsvImportError> errors = csvSyncService.getJobErrors(jobId);
        return ResponseEntity.ok(errors);
    }

    private CsvJobResponse toResponse(CsvImportJob job) {
        return CsvJobResponse.builder()
                .id(job.getId())
                .fileName(job.getFileName())
                .status(job.getStatus())
                .totalRows(job.getTotalRows())
                .successRows(job.getSuccessRows())
                .failedRows(job.getFailedRows())
                .startedAt(job.getStartedAt())
                .finishedAt(job.getFinishedAt())
                .build();
    }
}
