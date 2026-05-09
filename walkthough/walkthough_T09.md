# T09 Walkthrough - AI Summary (PDF Upload + AI Summarization)

## Muc tieu T09

- Xay dung luong upload file PDF.
- Tich hop OpenRouter (OpenAI-compatible) de doc file PDF, extract noi dung, va tra ve text tom tat cho workshop.
- Frontend cho phep organizer upload PDF va xem tom tat.

## Kien truc: Pipe & Filter

```
Upload PDF 
  → PdfExtractionService (Filter 1: extract text bang Apache PDFBox) 
  → OpenRouterAiService (Filter 2: goi AI de summarize) 
  → AiSummaryService (Orchestrator: phoi hop pipeline, persist entity)
```

Moi filter la mot class rieng, co the swap/replace ma khong anh huong pipeline.

---

## Backend

### File da them (6 files)

| File | Vai tro |
|------|---------|
| `config/AiProperties.java` | `@ConfigurationProperties("app.ai")` — API key, base URL, model, docs dir |
| `dto/ai/DocumentUploadResponse.java` | DTO: `{ documentId, fileName, fileSize, status }` |
| `dto/ai/AiSummaryResponse.java` | DTO: `{ summaryId, documentId, model, status, summaryText, createdAt }` |
| `repository/ai/WorkshopDocumentRepository.java` | JPA repo cho `workshop_documents` table |
| `repository/ai/AiSummaryRepository.java` | JPA repo cho `ai_summaries` table |
| `service/ai/PdfExtractionService.java` | **Filter 1** — doc PDF bang Apache PDFBox, extract plain text |
| `service/ai/OpenRouterAiService.java` | **Filter 2** — goi OpenRouter `/chat/completions` (OpenAI-compatible) de summarize |
| `service/ai/AiSummaryService.java` | **Orchestrator** — phoi hop pipeline: save file → extract → summarize → persist |
| `controller/AiSummaryController.java` | REST endpoints |

### File da sua (3 files)

| File | Thay doi |
|------|----------|
| `pom.xml` | Them `org.apache.pdfbox:pdfbox:3.0.4` |
| `application.yaml` | Them `app.ai` config block + `spring.servlet.multipart` max upload size |
| `.env.example` | Them `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`, `AI_DOCS_DIR` |

### Pipe & Filter chi tiet

**Filter 1 — PdfExtractionService:**
- Nhan `Path` toi file PDF
- Dung `Loader.loadPDF()` + `PDFTextStripper` de extract plain text
- Tra ve string (empty string neu khong extract duoc)

**Filter 2 — OpenRouterAiService:**
- Nhan extracted text (max 50k chars, bi truncated)
- Goi `POST {baseUrl}/chat/completions` voi system prompt tieng Viet
- System prompt: *"Tom tat noi dung workshop bang tieng Viet, 3-5 cau"*
- Model configurable qua `AI_MODEL` env var
- Timeout 30s, tra loi HTML status code tracking
- Mo rong de dang: ke thua/swap class neu dung provider khac

**Orchestrator — AiSummaryService:**
- `uploadAndSummarize(workshopId, file)`:
  1. Validate workshop + file la PDF
  2. Save file to `{AI_DOCS_DIR}/{workshopId}/{documentId}.pdf`
  3. Tao `WorkshopDocument` record (status: `EXTRACTING`)
  4. Goi `PdfExtractionService` → cap nhat `extractedText`
  5. Goi `OpenRouterAiService` → tao `AiSummary` record
  6. Tra ve `DocumentUploadResponse`
- `regenerateSummary(documentId)`: re-run filter 2 (skip filter 1)
- `getLatestSummary(workshopId)`: query AiSummaryRepository

**Error handling pipeline:**
- PDF khong doc duoc → `EXTRACTION_FAILED`
- PDF khong co text → `NO_TEXT`
- OpenRouter loi/ timeout → `SUMMARY_FAILED` + `errorMessage`
- Thieu API key → tra loi ERROR message

### REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/v1/ai/workshops/{id}/documents` | ORGANIZER/ADMIN | Upload PDF → auto-summarize |
| `GET` | `/api/v1/ai/workshops/{id}/documents` | ORGANIZER/ADMIN | List documents |
| `GET` | `/api/v1/ai/workshops/{id}/summary` | Any authenticated user | Get latest summary |
| `POST` | `/api/v1/ai/documents/{id}/summarize` | ORGANIZER/ADMIN | Re-generate summary |

### Database

Tables da ton tai tu V1 migration (khong can migration moi):
- `workshop_documents` — luu thong tin file PDF, extracted text, processing status
- `ai_summaries` — luu summary text, model, status (FK to workshop_documents)

---

## Frontend

### File da them (1 file)

| File | Vai tro |
|------|---------|
| `pages/organizer/AiSummaryPage.tsx` | Trang upload PDF + xem tom tat AI cho organizer |

### File da sua (2 file)

| File | Thay doi |
|------|----------|
| `router/index.tsx` | Them route `/organizer/workshops/:id/ai-summary` |
| `pages/organizer/Dashboard.tsx` | Them nut AI Summary (FileText icon) tren workshop card |

### AiSummaryPage component

- **Upload area:** Drag-drop hoac click de chon file PDF (max 10MB)
- **Document list:** Bang hien thi file da upload + status badge (COMPLETED, EXTRACTING, NO_TEXT, FAILED...)
- **Summary display:** Hien thi AI summary text, model, timestamp
- **Regenerate button:** Gui lai yeu cau summarize cho document da hoan thanh
- **Error handling:** Hien thi error message + dismiss button

---

## Cach chay

### 1) Setup API key
Them vao `src/.env`:
```
AI_API_KEY=your-openrouter-api-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o-mini
AI_DOCS_DIR=./data/documents
```

### 2) Build & start
```bash
docker compose -f src/docker-compose.yml up --build -d
```

### 3) Upload PDF (via frontend)
- Login as organizer
- Chon workshop
- Nhan nut AI Summary (FileText icon)
- Drop/click file PDF
- Cho pipeline hoan tat → summary hien thi

### 4) Test API (curl)
```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@unihub.local","password":"secret"}' | jq -r '.token')

# Upload PDF
curl -s -X POST "http://localhost:8080/api/v1/ai/workshops/WORKSHOP_UUID/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/path/to/file.pdf"
```

---

## Ghi chu

- Pipe & Filter architecture giup de dang swap AI provider (chi can implements filter 2 moi).
- PDFBox 3.x duoc dung thay vi Tika de giu dependency nhe.
- Khong co schema migration moi — tables da tao tu V1.
- Config max file size 10MB (configurable trong application.yaml).
- Model va base URL configurable qua .env — co the chuyen sang bat ky OpenAI-compatible provider nao (OpenAI, Groq, DeepSeek, ...).
