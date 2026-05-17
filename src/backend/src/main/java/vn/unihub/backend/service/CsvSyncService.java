package vn.unihub.backend.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.unihub.backend.config.CsvSyncProperties;
import vn.unihub.backend.entity.student.CsvImportError;
import vn.unihub.backend.entity.student.CsvImportJob;
import vn.unihub.backend.entity.student.Student;
import vn.unihub.backend.repository.student.CsvImportErrorRepository;
import vn.unihub.backend.repository.student.CsvImportJobRepository;
import vn.unihub.backend.repository.student.StudentRepository;
import vn.unihub.backend.exception.SyncInProgressException;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
@RequiredArgsConstructor
@Slf4j
public class CsvSyncService {

    private final CsvSyncProperties csvSyncProperties;
    private final StudentRepository studentRepository;
    private final CsvImportJobRepository csvImportJobRepository;
    private final CsvImportErrorRepository csvImportErrorRepository;
    private final EntityManager entityManager;
    private final PlatformTransactionManager transactionManager;

    private final AtomicBoolean running = new AtomicBoolean(false);

    /**
     * Scheduled sync – runs nightly at the configured cron expression.
     */
    @Scheduled(cron = "${app.csv-sync.cron}")
    public void scheduledSync() {
        log.info("Scheduled CSV sync triggered");
        syncAllFiles();
    }

    /**
     * Manual async trigger – returns the job ID immediately.
     */
    public UUID triggerSync() {
        log.info("Manual CSV sync triggered");
        return syncAllFiles();
    }

    /**
     * Get the status of a specific job.
     */
    public Optional<CsvImportJob> getJobStatus(UUID jobId) {
        return csvImportJobRepository.findById(jobId);
    }

    /**
     * List all recent jobs (newest first).
     */
    public List<CsvImportJob> listJobs() {
        return csvImportJobRepository.findAllByOrderByStartedAtDesc();
    }

    /**
     * Get errors for a specific job.
     */
    public List<CsvImportError> getJobErrors(UUID jobId) {
        return csvImportErrorRepository.findByJobId(jobId);
    }

    // -------------------------------------------------------------------------
    // Internal implementation
    // -------------------------------------------------------------------------

    private UUID syncAllFiles() {
        if (!running.compareAndSet(false, true)) {
            log.warn("CSV sync already in progress, skipping");
            throw new SyncInProgressException("A CSV sync is already in progress");
        }

        try {
            Path csvDir = Paths.get(csvSyncProperties.getCsvDir());
            if (!Files.exists(csvDir)) {
                Files.createDirectories(csvDir);
                log.info("Created CSV directory: {}", csvDir);
                running.set(false);
                return null;
            }

            List<Path> csvFiles = new ArrayList<>();
            try (DirectoryStream<Path> stream = Files.newDirectoryStream(csvDir, "*.csv")) {
                stream.forEach(csvFiles::add);
            }

            if (csvFiles.isEmpty()) {
                log.info("No CSV files found in {}", csvDir);
                running.set(false);
                return null;
            }

            List<Path> filesToProcess = new ArrayList<>();
            for (Path file : csvFiles) {
                String checksum = computeChecksum(file);
                if (csvImportJobRepository.findByFileChecksum(checksum).isEmpty()) {
                    filesToProcess.add(file);
                }
            }

            if (filesToProcess.isEmpty()) {
                log.info("No new CSV files found (all already imported)");
                running.set(false);
                return null;
            }

            // Create job records for all new files immediately
            List<CsvImportJob> jobs = new ArrayList<>();
            for (Path file : filesToProcess) {
                String checksum = computeChecksum(file);
                CsvImportJob job = CsvImportJob.builder()
                        .fileName(file.getFileName().toString())
                        .fileChecksum(checksum)
                        .status("PROCESSING")
                        .totalRows(0)
                        .successRows(0)
                        .failedRows(0)
                        .startedAt(Instant.now())
                        .build();
                jobs.add(csvImportJobRepository.save(job));
            }

            // Start processing in the background
            CompletableFuture.runAsync(() -> {
                TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);
                try {
                    for (int i = 0; i < filesToProcess.size(); i++) {
                        final int index = i;
                        transactionTemplate.executeWithoutResult(status -> {
                            try {
                                processFileContent(jobs.get(index), filesToProcess.get(index));
                            } catch (Exception e) {
                                log.error("Error processing file {}: {}", filesToProcess.get(index), e.getMessage(), e);
                            }
                        });
                    }
                } finally {
                    running.set(false);
                }
            });

            // Return the ID of the first job so the UI can poll it
            return jobs.get(0).getId();
        } catch (Exception e) {
            log.error("Error starting CSV sync: {}", e.getMessage(), e);
            running.set(false);
            return null;
        }
    }

    protected void processFileContent(CsvImportJob job, Path file) throws IOException {
        String fileName = file.getFileName().toString();
        log.info("Processing CSV file: {}", fileName);
        
        // Use a fresh reference to the job in this transaction
        final CsvImportJob savedJob = csvImportJobRepository.findById(job.getId()).orElse(job);

        int totalRows = 0;
        int successRows = 0;
        int failedRows = 0;

        try (BufferedReader reader = Files.newBufferedReader(file, StandardCharsets.UTF_8)) {
            // Read header line
            String headerLine = reader.readLine();
            if (headerLine == null) {
                savedJob.setStatus("COMPLETED");
                savedJob.setFinishedAt(Instant.now());
                csvImportJobRepository.save(savedJob);
                return;
            }

            // Determine column mapping from header
            String[] headers = parseCsvLine(headerLine);
            int studentCodeIdx = indexOf(headers, "student_code");
            int fullNameIdx = indexOf(headers, "full_name");
            int emailIdx = indexOf(headers, "email");
            int facultyIdx = indexOf(headers, "faculty");
            int majorIdx = indexOf(headers, "major");
            int cohortIdx = indexOf(headers, "cohort");
            int statusIdx = indexOf(headers, "status");

            if (studentCodeIdx == -1 || fullNameIdx == -1 || emailIdx == -1) {
                recordError(savedJob, 0, headerLine, "MISSING_COLUMNS",
                        "CSV must have at least 'student_code', 'full_name', 'email' columns");
                savedJob.setStatus("FAILED");
                savedJob.setFinishedAt(Instant.now());
                csvImportJobRepository.save(savedJob);
                return;
            }

            String line;
            int batchCounter = 0;
            while ((line = reader.readLine()) != null) {
                totalRows++;
                String[] columns;
                try {
                    columns = parseCsvLine(line);
                } catch (Exception e) {
                    failedRows++;
                    recordError(savedJob, totalRows, line, "PARSE_ERROR", e.getMessage());
                    continue;
                }

                if (columns.length <= Math.max(studentCodeIdx, Math.max(fullNameIdx, emailIdx))) {
                    failedRows++;
                    recordError(savedJob, totalRows, line, "INVALID_COLUMN_COUNT",
                            "Expected at least " + (Math.max(studentCodeIdx, Math.max(fullNameIdx, emailIdx)) + 1)
                                    + " columns, got " + columns.length);
                    continue;
                }

                String studentCode = columns[studentCodeIdx].trim();
                String fullName = columns[fullNameIdx].trim();
                String email = columns[emailIdx].trim();

                if (studentCode.isEmpty() || fullName.isEmpty() || email.isEmpty()) {
                    failedRows++;
                    recordError(savedJob, totalRows, line, "MISSING_REQUIRED_FIELDS",
                            "student_code, full_name, and email are required");
                    continue;
                }

                try {
                    upsertStudent(studentCode, fullName, email,
                            safeGet(columns, facultyIdx),
                            safeGet(columns, majorIdx),
                            safeGet(columns, cohortIdx),
                            safeGet(columns, statusIdx, "ACTIVE"),
                            fileName, totalRows);
                    successRows++;
                } catch (Exception e) {
                    failedRows++;
                    recordError(savedJob, totalRows, line, "UPSERT_ERROR", e.getMessage());
                }

                batchCounter++;
                if (batchCounter >= csvSyncProperties.getBatchSize()) {
                    entityManager.flush();
                    entityManager.clear();
                    batchCounter = 0;
                }
            }
        } catch (IOException e) {
            savedJob.setStatus("FAILED");
            savedJob.setFinishedAt(Instant.now());
            savedJob.setTotalRows(totalRows);
            savedJob.setSuccessRows(successRows);
            savedJob.setFailedRows(failedRows + 1); // count this IO error too
            csvImportJobRepository.save(savedJob);
            throw e;
        }

        savedJob.setTotalRows(totalRows);
        savedJob.setSuccessRows(successRows);
        savedJob.setFailedRows(failedRows);
        savedJob.setStatus(failedRows > 0 ? "PARTIALLY_COMPLETED" : "COMPLETED");
        savedJob.setFinishedAt(Instant.now());
        csvImportJobRepository.save(savedJob);

        log.info("CSV import completed: file={}, total={}, success={}, failed={}",
                fileName, totalRows, successRows, failedRows);
    }

    private void upsertStudent(String studentCode, String fullName, String email,
                                String faculty, String major, String cohort,
                                String status, String sourceFile, int sourceRow) {
        Optional<Student> existing = studentRepository.findByStudentCode(studentCode);

        Student student;
        if (existing.isPresent()) {
            student = existing.get();
            student.setFullName(fullName);
            student.setEmail(email);
            if (faculty != null) student.setFaculty(faculty);
            if (major != null) student.setMajor(major);
            if (cohort != null) student.setCohort(cohort);
            student.setStatus(status);
            student.setLastSyncedAt(Instant.now());
            student.setSourceFile(sourceFile);
            student.setSourceRowNumber(sourceRow);
        } else {
            student = Student.builder()
                    .studentCode(studentCode)
                    .fullName(fullName)
                    .email(email)
                    .faculty(faculty)
                    .major(major)
                    .cohort(cohort)
                    .status(status)
                    .lastSyncedAt(Instant.now())
                    .sourceFile(sourceFile)
                    .sourceRowNumber(sourceRow)
                    .build();
        }
        studentRepository.save(student);
    }

    private void recordError(CsvImportJob job, int rowNumber, String rawData, String errorCode, String errorMessage) {
        CsvImportError error = CsvImportError.builder()
                .job(job)
                .rowNumber(rowNumber)
                .rawData(rawData.length() > 1000 ? rawData.substring(0, 1000) : rawData)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .build();
        csvImportErrorRepository.save(error);
    }

    // -------------------------------------------------------------------------
    // CSV parsing helpers
    // -------------------------------------------------------------------------

    /**
     * Parse a single CSV line, respecting double-quote escaping.
     */
    static String[] parseCsvLine(String line) {
        List<String> fields = new ArrayList<>();
        StringBuilder sb = new StringBuilder();
        boolean inQuotes = false;

        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '"') {
                if (inQuotes && i + 1 < line.length() && line.charAt(i + 1) == '"') {
                    sb.append('"');
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c == ',' && !inQuotes) {
                fields.add(sb.toString().trim());
                sb.setLength(0);
            } else {
                sb.append(c);
            }
        }
        fields.add(sb.toString().trim());
        return fields.toArray(new String[0]);
    }

    // -------------------------------------------------------------------------
    // Utility helpers
    // -------------------------------------------------------------------------

    private String computeChecksum(Path file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] fileBytes = Files.readAllBytes(file);
            byte[] hash = digest.digest(fileBytes);
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private static int indexOf(String[] arr, String value) {
        for (int i = 0; i < arr.length; i++) {
            if (arr[i].trim().equalsIgnoreCase(value)) {
                return i;
            }
        }
        return -1;
    }

    private static String safeGet(String[] arr, int idx) {
        if (idx >= 0 && idx < arr.length) {
            return arr[idx].trim();
        }
        return null;
    }

    private static String safeGet(String[] arr, int idx, String defaultValue) {
        String val = safeGet(arr, idx);
        return (val != null && !val.isEmpty()) ? val : defaultValue;
    }
}
