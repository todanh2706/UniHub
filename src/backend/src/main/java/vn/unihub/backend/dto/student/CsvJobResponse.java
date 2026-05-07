package vn.unihub.backend.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvJobResponse {
    private UUID id;
    private String fileName;
    private String status;
    private Integer totalRows;
    private Integer successRows;
    private Integer failedRows;
    private Instant startedAt;
    private Instant finishedAt;
}
