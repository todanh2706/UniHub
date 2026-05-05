package vn.unihub.backend.entity.student;

import jakarta.persistence.*;
import lombok.*;
import vn.unihub.backend.entity.auth.User;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "student_code", nullable = false, unique = true)
    private String studentCode;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    private String faculty;

    private String major;

    private String cohort;

    @Column(nullable = false)
    private String status;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "source_file")
    private String sourceFile;

    @Column(name = "source_row_number")
    private Integer sourceRowNumber;
}
