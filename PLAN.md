# PLAN: T10 – Cài đặt Đồng bộ dữ liệu CSV

## Goal

Implement a scheduled background job that reads CSV files from a configurable local directory, upserts `Student` records into the database, and logs any parse/validation errors per row (fault tolerance). The job runs nightly via Spring `@Scheduled`, with an **additional manual trigger** accessible from the Organizer admin UI.

## Clarifications (from Phase 1)

| Question | Answer |
|----------|--------|
| **Scope** | T10 only (CSV Sync) |
| **Approach** | Spring `@Scheduled` inside the existing backend app |
| **CSV location** | Local folder mount (Docker volume) |
| **Manual trigger** | Admin UI button in Organizer panel → REST API → async job |
| **Re-import behavior** | Only unprocessed files (by checksum) |
| **Response style** | Return Job ID immediately (async), pollable via status endpoint |
| **Notifications (T11)** | Leave to Danh; no overlap |

## Prerequisites (already in place)

- **Schema**: Tables `csv_import_jobs` and `csv_import_errors` already exist in `V1__init_schema.sql`
- **Entities**: `CsvImportJob`, `CsvImportError`, and `Student` already exist
- **Repository**: `StudentRepository` exists (but needs a `findByStudentCode` method for upsert)
- **No scheduler yet**: `@EnableScheduling` and `@EnableAsync` are missing on the application class

## Affected Files

### Backend (7 new, 2 modified)

| File | Action |
|------|--------|
| `src/backend/src/main/java/vn/unihub/backend/BackendApplication.java` | **Modify** – add `@EnableScheduling` and `@EnableAsync` |
| `src/backend/src/main/java/vn/unihub/backend/config/CsvSyncProperties.java` | **Create** – config properties for CSV directory, cron, batch size |
| `src/backend/src/main/java/vn/unihub/backend/repository/student/StudentRepository.java` | **Modify** – add `findByStudentCode(String)` |
| `src/backend/src/main/java/vn/unihub/backend/repository/student/CsvImportJobRepository.java` | **Create** – JPA repository for `CsvImportJob` (with `findByFileChecksum`) |
| `src/backend/src/main/java/vn/unihub/backend/repository/student/CsvImportErrorRepository.java` | **Create** – JPA repository for `CsvImportError` |
| `src/backend/src/main/java/vn/unihub/backend/service/CsvSyncService.java` | **Create** – core service: parse CSV, upsert students, record errors. Supports both `@Scheduled` and `triggerSync()` returning job ID |
| `src/backend/src/main/java/vn/unihub/backend/controller/CsvSyncController.java` | **Create** – REST endpoints for manual trigger + job status polling |
| `src/backend/src/main/java/vn/unihub/backend/dto/student/CsvJobResponse.java` | **Create** – DTO for job status response |
| `src/backend/src/main/resources/application.yaml` | **Modify** – add `app.csv-sync.*` config properties |

### Infrastructure (3 modified)

| File | Action |
|------|--------|
| `src/.env.example` | **Modify** – add `CSV_SYNC_DIR` env variable |
| `src/docker-compose.yml` | **Modify** – add volume mount for CSV directory + env var |

### Frontend (3 new, 2 modified)

| File | Action |
|------|--------|
| `src/frontend/src/pages/organizer/CsvSyncPage.tsx` | **Create** – page with trigger button, job history table, status polling |
| `src/frontend/src/pages/organizer/Layout.tsx` | **Modify** – add "CSV Sync" item to sidebar navigation |
| `src/frontend/src/router/index.tsx` | **Modify** – add route `/organizer/csv-sync` → `CsvSyncPage` |

### Tests (1 new)

| File | Action |
|------|--------|
| `src/backend/src/test/java/vn/unihub/backend/service/CsvSyncServiceTest.java` | **Create** – unit test for CSV parsing, upsert, and error handling |

## Step-by-Step Implementation

### 1. Enable scheduling and async in the application

- Add `@EnableScheduling` and `@EnableAsync` to `BackendApplication.java`

### 2. Create configuration properties class

- Create `CsvSyncProperties.java` under `config/` package
  - Fields: `csvDir` (String, default `./data/csv`), `cron` (String, default `0 0 2 * * *` — 2 AM daily), `batchSize` (int, default `100`)
  - Annotated with `@ConfigurationProperties("app.csv-sync")`

### 3. Add new repositories

- **`CsvImportJobRepository`** extends `JpaRepository<CsvImportJob, UUID>`:
  - `Optional<CsvImportJob> findByFileChecksum(String checksum)` — to detect re-imports
  - `List<CsvImportJob> findAllByOrderByStartedAtDesc()` — for listing recent jobs
- **`CsvImportErrorRepository`** extends `JpaRepository<CsvImportError, UUID>`:
  - `List<CsvImportError> findByJobId(UUID jobId)` — for detailed error view
- **`StudentRepository`** — add `Optional<Student> findByStudentCode(String studentCode)`

### 4. Implement `CsvSyncService`

- **`@Async` method `triggerSync()`** — returns `CompletableFuture<UUID>`:
  1. Scans `csvSyncProperties.getCsvDir()` for `*.csv` files
  2. For each new file (checksum not in DB):
     - Creates `CsvImportJob` with status `PROCESSING`
     - Parses CSV line by line using a simple parser (e.g., `BufferedReader` + split, or OpenCSV)
     - Upserts each student row; records errors per row
     - Finalizes the job (COMPLETED / PARTIALLY_COMPLETED)
  3. Returns the job ID

- **`@Scheduled(cron = ...)` method `scheduledSync()`** — calls `triggerSync()` internally

- **Helper methods**:
  - `getFileChecksum(Path)` — SHA-256 hex digest
  - `parseRow(String line, int rowNumber)` — map CSV columns → `Student` fields
  - `upsertStudent(Student parsed)` — `findByStudentCode` → update or create

- **New method `getJobStatus(UUID jobId)`** — returns job status + summary counts

### 5. Create `CsvSyncController`

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `POST /api/v1/csv-sync/trigger` | `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")` | Triggers async sync, returns `{ jobId }` |
| `GET /api/v1/csv-sync/jobs/{jobId}` | `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")` | Poll job status: `{ id, status, totalRows, successRows, failedRows, startedAt, finishedAt }` |
| `GET /api/v1/csv-sync/jobs` | `@PreAuthorize("hasAnyRole('ADMIN', 'ORGANIZER')")` | List recent jobs (last 20, newest first) |

### 6. Create `CsvJobResponse` DTO

Fields: `id`, `fileName`, `status`, `totalRows`, `successRows`, `failedRows`, `startedAt`, `finishedAt`

### 7. Wire config into `application.yaml`

```yaml
app:
  csv-sync:
    csv-dir: ${CSV_SYNC_DIR:./data/csv}
    cron: ${CSV_SYNC_CRON:0 0 2 * * *}
    batch-size: ${CSV_SYNC_BATCH_SIZE:100}
```

### 8. Update `src/.env.example`

Add `CSV_SYNC_DIR=./data/csv`

### 9. Update `docker-compose.yml`

```yaml
backend:
  volumes:
    - ./data/csv:/app/data/csv
  environment:
    CSV_SYNC_DIR: /app/data/csv
```

### 10. Frontend: New `CsvSyncPage.tsx`

A page under the organizer panel with:
- **Header**: "CSV Data Sync" title + description
- **Trigger button**: "Sync Now" button, calls `POST /api/v1/csv-sync/trigger`
  - Shows loading state while async job runs
  - On response, starts polling `GET /api/v1/csv-sync/jobs/{jobId}` every 3s until status is terminal
  - Shows toast/snackbar on completion
- **Job history table**: lists recent jobs showing filename, status badge, rows processed, timestamps
  - Click a row to expand error details (calls `GET /api/v1/csv-sync/jobs/{jobId}/errors`)

### 11. Frontend: Modify Organizer `Layout.tsx`

Add a new sidebar nav item:
```tsx
{ name: 'CSV Sync', path: '/organizer/csv-sync', icon: FileText }
```

### 12. Frontend: Modify `router/index.tsx`

Add route:
```tsx
{ path: 'csv-sync', element: <CsvSyncPage /> }
```

### 13. Write unit tests

- `CsvSyncServiceTest` — test with:
  - Valid CSV with 3 rows → 3 upserted, 0 errors
  - CSV with invalid rows (missing fields) → partial success + error records
  - Duplicate student codes → updated, not duplicated
  - Empty CSV → 0 rows processed
  - Missing file/directory → graceful handling

## Expected CSV Format

```
student_code,full_name,email,faculty,major,cohort,status
SV001,Nguyen Van A,a@univ.edu,CNTT,KHMT,K26,ACTIVE
SV002,Tran Thi B,b@univ.edu,KHDL,HTTT,K26,ACTIVE
```

## Risks and Edge Cases

| Risk | Mitigation |
|------|------------|
| **Large CSV files** (10k+ rows) | Process in batches of `batchSize` (via flush & clear after each batch) to avoid OOM |
| **Duplicate CSV re-import** | Check file checksum against existing jobs; skip if already imported |
| **Partial failure** | Each row is processed independently; errors are logged per row, job continues |
| **Concurrent manual + scheduled runs** | Use a simple lock (e.g., `AtomicBoolean isRunning`) to prevent concurrent executions |
| **CSV encoding** | Assume UTF-8; handle gracefully if BOM detected |
| **Missing directory** | Create on startup if not exists; log warning |
| **Malformed CSV** | Use robust parsing that handles quoted fields |
| **Frontend polling on stale page** | Clean up interval on component unmount |

## Estimated Blast Radius

| Layer | Files touched |
|-------|---------------|
| **Backend** | 9 files (2 modify + 7 create) |
| **Config/Infra** | 3 files (`.env.example`, `docker-compose.yml`, `application.yaml`) |
| **Frontend** | 5 files (1 create page + 2 modify + CSS if needed) |
| **Tests** | 1 new test file |
| **Database** | No migration needed (tables already exist) |
