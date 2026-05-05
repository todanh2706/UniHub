package vn.unihub.backend.entity.student;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "csv_import_jobs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvImportJob {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_checksum", nullable = false)
    private String fileChecksum;

    @Column(nullable = false)
    private String status;

    @Column(name = "total_rows")
    private Integer totalRows;

    @Column(name = "success_rows")
    private Integer successRows;

    @Column(name = "failed_rows")
    private Integer failedRows;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;
}
