package vn.unihub.backend.repository.student;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.student.CsvImportJob;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CsvImportJobRepository extends JpaRepository<CsvImportJob, UUID> {
    Optional<CsvImportJob> findByFileChecksum(String fileChecksum);
    List<CsvImportJob> findAllByOrderByStartedAtDesc();
}
