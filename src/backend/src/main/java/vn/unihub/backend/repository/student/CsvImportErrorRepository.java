package vn.unihub.backend.repository.student;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.unihub.backend.entity.student.CsvImportError;

import java.util.List;
import java.util.UUID;

public interface CsvImportErrorRepository extends JpaRepository<CsvImportError, UUID> {
    List<CsvImportError> findByJobId(UUID jobId);
}
