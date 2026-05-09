# T10 Walkthrough - Dong bo du lieu CSV (CSV Sync)

## Muc tieu T10

- Viet cronjob/worker doc file CSV xuat ra hang dem.
- Xu ly upsert du lieu sinh vien, bo qua loi dong (fault tolerance) de khong chet ca tien trinh.

## Nhung gi da hoan thanh

### 1) Schedule & Async configuration

**File da sua:**
- `src/backend/src/main/java/vn/unihub/backend/BackendApplication.java`
  - Them `@EnableScheduling` de kick hoat cronjob.
  - Them `@EnableAsync` de ho tro manual trigger bat dong bo.

### 2) Configuration properties

**File da tao:**
- `src/backend/src/main/java/vn/unihub/backend/config/CsvSyncProperties.java`

**Properties (`application.yaml`):**
```yaml
app:
  csv-sync:
    csv-dir: ${CSV_SYNC_DIR:./data/csv}    # Thu muc chua file CSV
    cron: ${CSV_SYNC_CRON:0 0 2 * * *}       # Lich chay (mac dinh 2 AM hang ngay)
    batch-size: ${CSV_SYNC_BATCH_SIZE:100}   # So dong xu ly truoc khi flush DB
```

### 3) Repositories

**File da tao:**
- `src/backend/src/main/java/vn/unihub/backend/repository/student/CsvImportJobRepository.java`
  - `findByFileChecksum(String)` — kiem tra file da import truoc do
  - `findAllByOrderByStartedAtDesc()` — lay danh sach job moi nhat
- `src/backend/src/main/java/vn/unihub/backend/repository/student/CsvImportErrorRepository.java`
  - `findByJobId(UUID)` — lay loi theo job

**File da sua:**
- `src/backend/src/main/java/vn/unihub/backend/repository/student/StudentRepository.java`
  - Them `findByStudentCode(String)` de support upsert

### 4) Core Service: CsvSyncService

**File da tao:**
- `src/backend/src/main/java/vn/unihub/backend/service/CsvSyncService.java`

**Chuc nang chinh:**

| Method | Annotation | Chuc nang |
|--------|-----------|-----------|
| `scheduledSync()` | `@Scheduled` | Chay theo cron (2 AM hang ngay) |
| `triggerSync()` | `@Async` | Trigger manual, tra ve `CompletableFuture<UUID>` ngay |
| `getJobStatus(UUID)` | — | Lay trang thai job |
| `listJobs()` | — | Danh sach job (moi nhat truoc) |
| `getJobErrors(UUID)` | — | Danh sach loi cua job |

**Luong xu ly (`processFile`):**
```
CSV file → SHA-256 checksum → kiem tra duplicate
  → Tao CsvImportJob (status = PROCESSING)
  → Doc header → map cot
  → Doc tung dong:
      ✓ Hop le → upsert Student (findByStudentCode hoac create)
      ✗ Loi   → ghi CsvImportError, continue
    Cu 100 dong → flush + clear EntityManager
  → Ket thuc: COMPLETED / PARTIALLY_COMPLETED / FAILED
```

**Co che an toan:**
- `AtomicBoolean running` — ngan chay overlap giua manual + scheduled
- SHA-256 checksum — tranh import file trung lap
- Batch flush — tranh OOM voi file lon (tested voi 250 dong +)
- Fault tolerance — dong loi khong lam chet job

### 5) REST Controller

**File da tao:**
- `src/backend/src/main/java/vn/unihub/backend/controller/CsvSyncController.java`

| Endpoint | Method | Auth | Mo ta |
|----------|--------|------|-------|
| `/api/v1/csv-sync/trigger` | POST | ORGANIZER/ADMIN | Kick hoat sync, tra ve `{jobId}` |
| `/api/v1/csv-sync/jobs/{jobId}` | GET | ORGANIZER/ADMIN | Poll trang thai job |
| `/api/v1/csv-sync/jobs` | GET | ORGANIZER/ADMIN | Danh sach job gan day |
| `/api/v1/csv-sync/jobs/{jobId}/errors` | GET | ORGANIZER/ADMIN | Chi tiet loi tung dong |

### 6) DTO

**File da tao:**
- `src/backend/src/main/java/vn/unihub/backend/dto/student/CsvJobResponse.java`
  - Fields: `id`, `fileName`, `status`, `totalRows`, `successRows`, `failedRows`, `startedAt`, `finishedAt`

### 7) Frontend: CSV Sync Page

**File da tao:**
- `src/frontend/src/pages/organizer/CsvSyncPage.tsx`

**Giao dien gom:**
- Header: "CSV Data Sync" + mo ta
- Button "Sync Now":
  - Call `POST /api/v1/csv-sync/trigger`
  - Nhan ve `jobId`, bat dau poll `GET .../jobs/{jobId}` moi 3s
  - Hien thi spinner trong luc processing
  - Hien thi trang thai hoan thanh/loi
- Bang "Sync History":
  - Cot: File, Status, Total, Success, Failed, Started, Finished
  - Job co loi → click de expand chi tiet (table errors)
- Badge status: Processing (vang), Completed (xanh), Partial (cam), Failed (do)

**File da sua:**
- `src/frontend/src/pages/organizer/Layout.tsx` — Them "CSV Sync" vao sidebar
- `src/frontend/src/router/index.tsx` — Them route `/organizer/csv-sync`

### 8) Infrastructure

- `src/.env.example` — Them `CSV_SYNC_DIR=./data/csv`
- `src/docker-compose.yml` — Them volume mount `./data/csv:/app/data/csv` + env var
- `src/data/csv/.gitkeep` — Thu muc cho Docker volume

### 9) Unit tests

**File da tao:**
- `src/backend/src/test/java/vn/unihub/backend/service/CsvSyncServiceTest.java`

| Test | Mo ta |
|------|-------|
| `parseCsvLine_simpleFields` | CSV parser: field don gian |
| `parseCsvLine_quotedFieldWithComma` | CSV parser: field co dau phay |
| `parseCsvLine_quotedFieldWithDoubleQuotes` | CSV parser: field co double-quote |
| `parseCsvLine_emptyFields` | CSV parser: field rong |
| `processFile_validCsv_upsertsStudents` | 3 dong hop le → 3 student |
| `processFile_duplicateStudentCode_updatesExisting` | Upsert: cap nhat thay vi tao moi |
| `processFile_invalidRows_skipsAndRecordsErrors` | Loi dong → ghi error, van tiep |
| `processFile_emptyCsv_createsCompletedJob` | File rong → job COMPLETED |
| `processFile_missingRequiredColumns_failsJob` | Thieu cot → job FAILED |
| `processFile_sameChecksum_skipsDuplicate` | Checksum trung → skip |
| `processFile_largeBatch_flushesPeriodically` | 250 dong → flush sau 100 |

## Kien truc tong quan

```
[Thu muc ./data/csv]
       │
       ├── [Scheduled: 2 AM hang ngay]
       │       └── @Scheduled → CsvSyncService.scheduledSync()
       │
       ├── [Manual: Admin UI button]
       │       └── POST /api/v1/csv-sync/trigger
       │               └── @Async → CsvSyncService.triggerSync()
       │
       └── [Polling: Client]
               └── GET /api/v1/csv-sync/jobs/{jobId}
                       └── Tra ve trang thai: PROCESSING / COMPLETED / FAILED
```

## Cach su dung

### Dong bo tu dong (2 AM)
Chi can dat file CSV vao thu muc `./data/csv`. Job tu dong chay luc 2 AM.

### Dong bo thu cong (Manual trigger)
1. Dat file CSV vao `./data/csv`
2. Vao Organizer panel → "CSV Sync"
3. Bam "Sync Now"
4. Theo doi tien trinh trong bang "Sync History"

### API curl
```bash
# Trigger
curl -X POST http://localhost:8080/api/v1/csv-sync/trigger \
  -H "Authorization: Bearer $TOKEN"

# Poll job status
curl http://localhost:8080/api/v1/csv-sync/jobs/$JOB_ID \
  -H "Authorization: Bearer $TOKEN"

# List jobs
curl http://localhost:8080/api/v1/csv-sync/jobs \
  -H "Authorization: Bearer $TOKEN"

# Get errors
curl http://localhost:8080/api/v1/csv-sync/jobs/$JOB_ID/errors \
  -H "Authorization: Bearer $TOKEN"
```

## File bi anh huong

| File | Action |
|------|--------|
| `BackendApplication.java` | Modify: +`@EnableScheduling`, +`@EnableAsync` |
| `CsvSyncProperties.java` | Create: config properties |
| `StudentRepository.java` | Modify: +`findByStudentCode` |
| `CsvImportJobRepository.java` | Create: JPA repository |
| `CsvImportErrorRepository.java` | Create: JPA repository |
| `CsvJobResponse.java` | Create: DTO |
| `CsvSyncService.java` | Create: core service |
| `CsvSyncController.java` | Create: REST endpoints |
| `CsvSyncPage.tsx` | Create: Admin UI page |
| `Layout.tsx` | Modify: +sidebar nav |
| `router/index.tsx` | Modify: +route |
| `application.yaml` | Modify: +config |
| `.env.example` | Modify: +env var |
| `docker-compose.yml` | Modify: +volume, +env |
| `CsvSyncServiceTest.java` | Create: 11 tests |
