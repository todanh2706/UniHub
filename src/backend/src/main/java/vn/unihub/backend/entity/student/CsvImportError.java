package vn.unihub.backend.entity.student;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "csv_import_errors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsvImportError {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private CsvImportJob job;

    @Column(name = "row_number", nullable = false)
    private Integer rowNumber;

    @Column(name = "raw_data", columnDefinition = "TEXT")
    private String rawData;

    @Column(name = "error_code")
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}
