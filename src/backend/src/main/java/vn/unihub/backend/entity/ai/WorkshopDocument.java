package vn.unihub.backend.entity.ai;

import jakarta.persistence.*;
import lombok.*;
import vn.unihub.backend.entity.catalog.Workshop;

import java.util.UUID;

@Entity
@Table(name = "workshop_documents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkshopDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workshop_id", nullable = false)
    private Workshop workshop;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    @Column(name = "file_name")
    private String fileName;

    @Column(name = "mime_type")
    private String mimeType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "processing_status", nullable = false)
    private String processingStatus;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
}
