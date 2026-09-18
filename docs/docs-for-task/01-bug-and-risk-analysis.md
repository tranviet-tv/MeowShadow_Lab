# MeowShadow Lab — Phan Tich Bug & Rui Ro Tiem An

> **Tai lieu so:** 01
> **Ngay tao:** 2026-09-16
> **Pham vi:** Toan bo du an — `gateway-core` (Go), `script-llm` (Python), `tts-engine` (Python), `audio-processor` (Python), `apps/web` (Next.js)
> **Muc do:** [CRITICAL] · [HIGH] · [MEDIUM] · [LOW]

---

## Tong Quan Kien Truc

```
apps/web (Next.js 15)
    HTTP REST + WebSocket
services/gateway-core (Go/Fiber)
    Redis Pub/Sub + Queue
services/script-llm   (Python/FastAPI)  -> Ollama Qwen3:8b
services/tts-engine   (Python/FastAPI)  -> Edge-TTS
services/audio-processor (Python/FastAPI) -> FFmpeg/pydub
    Shared Volume
Storage (Docker Volume: meowshadow_storage_data)
Database: PostgreSQL 16 + pgvector
Cache/Broker: Redis 7
```

---

## 1. SECURITY — Lo Hong Bao Mat

### [CRITICAL] BUG-SEC-01: CORS Wildcard tren tat ca Services

**File:** `services/*/src/main.py` (tat ca 3 Python services)

```python
# services/script-llm/src/main.py:30-36
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Wildcard tren PRODUCTION endpoint
    allow_credentials=True,   # credentials=True + origins=* la cau hinh KHONG HOP LE
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Van de:** Theo RFC va spec cua browsers, ket hop `allow_credentials=True` voi `allow_origins=["*"]` la **invalid** va se bi browsers chan voi loi CORS. Day dong thoi la lo hong bao mat nghiem trong neu chay production.

**Anh huong:** Tat ca 3 internal Python services (`script-llm:8001`, `tts-engine:8002`, `audio-processor:8003`).

**Fix:** Restrict origins ve danh sach cu the hoac bo `allow_credentials=True` neu khong can.

---

### [CRITICAL] BUG-SEC-02: JWT Secret mac dinh khong an toan trong Docker Compose

**File:** `docker-compose.yml:121`

```yaml
- JWT_SECRET=${JWT_SECRET:-meowshadow_super_secret_jwt_key_2026_change_in_production!}
```

**Van de:** Fallback secret duoc hardcode trong `docker-compose.yml` duoi dang plaintext. Neu `.env` khong duoc cau hinh, secret yeu nay se duoc dung trong Docker production. Secret nay cung dang ton tai trong git history.

**Fix:** Bo fallback value, yeu cau `JWT_SECRET` phai duoc set bat buoc.

---

### [HIGH] BUG-SEC-03: Guest Login tao User thuc trong Database

**File:** `services/gateway-core/internal/services/auth_service.go:196-235`

```go
func (s *authService) GuestLogin(ctx context.Context) (*AuthResponse, error) {
    guestID := uuid.New().String()
    guestEmail := fmt.Sprintf("guest_%s@meowshadow.local", guestID[:8])
    dummyHash := "$2a$10$guest.account.not.directly.password.loggable"
    created, err := s.userRepo.CreateUser(ctx, guestEmail, dummyHash, "Guest Explorer")
```

**Van de:**
1. Moi lan goi `/auth/guest` tao ra 1 user row moi trong DB — Database bi inflate vo han
2. `dummyHash` la mot hardcoded bcrypt hash gia — ve mat ly thuyet co the bi bypass
3. Khong co co che cleanup/expiry cho guest accounts
4. Khong co rate limiting tren endpoint nay — co the bi abuse tao hang trieu guest records

**Fix:** Dung ephemeral guest token (JWT only, khong persist DB) hoac co TTL cleanup job.

---

### [HIGH] BUG-SEC-04: Seed Data chua Bcrypt Hash trong SQL committed vao Git

**File:** `services/gateway-core/init.sql:84`

```sql
'$2a$12$e8q4lVvX6b5w3yKjN9.CtuF59cW3hXfK7D1yI9w2lFkE8X1A6Q6Zy'
```

**Van de:** Password hash duoc hardcode trong `init.sql` — committed vao git — bat ky ai co access repo deu co the brute-force hash nay offline.

**Fix:** Dung bien moi truong hoac mot script seed rieng khong committed vao git.

---

## 2. RACE CONDITIONS & CONCURRENCY — Loi Dong Thoi

### [CRITICAL] BUG-RACE-01: WebSocket Hub - Delete map trong RLock

**File:** `services/gateway-core/internal/websocket/hub.go:94-105`

```go
case message := <-h.broadcast:
    h.mu.RLock()          // Chi Read Lock
    for client := range h.clients {
        select {
        case client.Send <- message:
        default:
            close(client.Send)
            delete(h.clients, client)  // GHI vao map trong RLock -> DATA RACE!
        }
    }
    h.mu.RUnlock()
```

**Van de:** `delete(h.clients, client)` la write operation nhung dang nam trong `RLock()`. Go's `sync.RWMutex` **khong cho phep** write trong Read lock. Dieu nay gay ra **data race** co the dan den panic hoac undefined behavior.

**Fix:** Upgrade len `mu.Lock()` cho case `broadcast`, hoac collect dead clients roi xoa sau khi RUnlock.

---

### [HIGH] BUG-RACE-02: TTS Worker — completed_count khong thread-safe

**File:** `services/tts-engine/src/workers/tts_worker.py:95-116`

```python
completed_count = 0

async def _run_single(chunk: TTSChunkRequest) -> TTSClipResult:
    nonlocal completed_count
    res = await edge_engine._synthesize_chunk_task(...)
    completed_count += 1  # asyncio.gather chay concurrent, day khong phai atomic
```

**Van de:** Trong asyncio voi `gather`, viec increment `completed_count` co the gap race condition. Pattern nay khong an toan ve correctness cua progress reporting.

**Fix:** Dung `asyncio.Lock` hoac atomic counter thong qua `asyncio.Queue`.

---

### [HIGH] BUG-RACE-03: PipelineConsumer - Check-then-act race khi fallback sang Redis

**File:** `services/gateway-core/internal/orchestrator/pipeline_consumer.go:144-167`

```go
func (c *pipelineConsumer) GetJob(jobID string) (*RenderJob, error) {
    c.mu.RLock()
    job, exists := c.jobs[jobID]
    c.mu.RUnlock()

    if exists {
        return job, nil
    }
    // Hai goroutines co the dong thoi miss cache va cung RegisterJob
    if c.producer != nil {
        ...
        c.RegisterJob(&redisJob)  // Race: job duoc add 2 lan, state machine diverge
        ...
    }
```

**Van de:** Co **check-then-act race** giua `RLock` read va `RegisterJob` write. Hai goroutines co the dong thoi miss cache, load tu Redis, roi cung call `RegisterJob` — state machine cua 2 copies diverge.

**Fix:** Dung double-checked locking pattern voi Write Lock khi fallback to Redis.

---

## 3. MEMORY LEAKS — Ro Ri Bo Nho

### [CRITICAL] BUG-MEM-01: In-memory Job Map khong bao gio duoc cleanup

**File:** `services/gateway-core/internal/orchestrator/pipeline_consumer.go`

```go
type pipelineConsumer struct {
    mu   sync.RWMutex
    jobs map[string]*RenderJob  // Chi add, khong bao gio remove
    ...
}
```

**Van de:** `jobs` map duoc populate qua `RegisterJob` nhung **khong co bat ky mechanism nao de remove** completed/failed jobs. Moi render job se ton tai mai mai trong memory. Voi traffic du lon, process se bi OOM (Out of Memory).

**Fix:** Them background cleanup goroutine xoa jobs o terminal state (READY/FAILED) sau 1-2 gio, hoac implement max-size LRU eviction.

---

### [HIGH] BUG-MEM-02: WebSocket Hub - Stale Subscription Maps khong duoc cleanup

**File:** `services/gateway-core/internal/websocket/hub.go:47-48`

**Van de:** `jobSubscriptions` va `lessonSubscriptions` chi duoc cleanup khi hub stop. Khi mot job hoan thanh nhung client khong disconnect, subscription entry van con trong map. Long-running instances se tich luy stale entries.

**Fix:** Cleanup subscription entries sau khi job/lesson dat terminal state.

---

### [HIGH] BUG-MEM-03: TTS Worker tao new asyncio event loop cho moi job

**File:** `services/tts-engine/src/workers/tts_worker.py:150-162`

```python
def process_job_payload(self, raw_data: str, ...) -> Dict[str, Any]:
    loop = asyncio.new_event_loop()  # New loop moi job
    try:
        asyncio.set_event_loop(loop)
        response = loop.run_until_complete(...)
        return response.model_dump()
    finally:
        loop.close()
```

**Van de:** Tao va destroy mot asyncio event loop moi cho **moi TTS job** la rat ton kem ve resource. Neu `loop.close()` khong cleanup hoan toan, se co resource leak. `asyncio.set_event_loop()` trong threading context co the gay interference.

**Fix:** Dung `asyncio.run()` truc tiep hoac mot persistent event loop chay trong dedicated thread.

---

## 4. DATA INTEGRITY — Toan Ven Du Lieu

### [CRITICAL] BUG-DATA-01: CreateLesson dung Placeholder Paths cho Audio/SRT khong ton tai

**File:** `services/gateway-core/internal/services/lesson_service.go:84-91`

```go
audioPath := req.AudioFilePath
if audioPath == "" {
    audioPath = "/app/storage/audio/placeholder.mp3"  // File nay khong duoc tao boi Dockerfile
}
srtPath := req.SrtFilePath
if srtPath == "" {
    srtPath = "/app/storage/audio/placeholder.srt"  // File nay khong ton tai
}
```

**Van de:**
1. `placeholder.mp3` va `placeholder.srt` khong duoc tao boi bat ky Dockerfile hay init script nao
2. Client query bai hoc moi tao — audio/subtitle endpoint tra 404
3. Path `/app/storage/audio/...` la container-specific path

**Anh huong:** Moi lesson moi duoc tao thong qua Studio (chua co audio) se co `audioFilePath` tro den file khong ton tai.

---

### [MEDIUM] BUG-DATA-02: Word Count duoc tinh bang `len(text) / 5` - Rat Khong Chinh Xac

**File:** `services/gateway-core/internal/orchestrator/pipeline_consumer.go:326-328`

```go
for _, ch := range job.TranscriptChunks {
    totalWords += len(ch.Text) / 5  // Uoc tinh hoan toan sai
}
```

**Van de:** Dung `len(text) / 5` de uoc tinh word count la cuc ky khong chinh xac, dac biet voi tieng Viet (dau thanh), tieng Nhat (1 character = 1 tu), tu ngan/dai bat thuong.

**Fix:** Goi `strings.Fields(text)` de dem words.

---

### [MEDIUM] BUG-DATA-03: LessonResponse.UpdatedAt luon bang CreatedAt khi tao moi

**File:** `services/gateway-core/internal/services/lesson_service.go:133-134`

```go
CreatedAt: createdRow.CreatedAt.Time.Format(time.RFC3339),
UpdatedAt: createdRow.CreatedAt.Time.Format(time.RFC3339),  // Dung CreatedAt cho ca UpdatedAt
```

**Van de:** `UpdatedAt` duoc set bang `CreatedAt.Time` thay vi `UpdatedAt.Time` tu database row. Frontend se hien thi sai thong tin.

---

### [MEDIUM] BUG-DATA-04: Lesson Status mac dinh la "READY" cho bai chua co audio

**File:** `services/gateway-core/internal/services/lesson_service.go:93-96`

```go
status := req.Status
if status == "" {
    status = "READY"  // Default READY nhung audio chua co
}
```

**Van de:** Tao lesson truc tiep qua `/lessons` endpoint ma khong truyen status — mac dinh la `"READY"` du chua co audio file thuc su — inconsistent state voi pipeline flow.

---

## 5. ERROR HANDLING — Xu Ly Loi Khong Day Du

### [HIGH] BUG-ERR-01: Tat ca Redis errors bi silent ignore trong Pipeline

**File:** `services/gateway-core/internal/orchestrator/pipeline_consumer.go`

```go
_ = c.producer.PushToQueue(ctx, queue.QueueTtsSynthesis, ttsPayload)
_ = c.producer.PublishEvent(ctx, queue.TopicTtsSynthesize, ttsPayload)
_ = c.producer.SaveJobState(ctx, job.ID, job.GetSnapshot(), 24*time.Hour)
```

**Van de:** Toan bo Redis operations dang **dung blank identifier** de discard errors. Neu Redis mat ket noi hoac queue day, job se bi mat hoan toan ma khong co alert, retry, hay fallback. Client nhan `200 OK` nhung audio khong bao gio duoc tao.

**Fix:** Log errors, implement retry logic voi exponential backoff.

---

### [HIGH] BUG-ERR-02: JSON Unmarshal errors bi silent ignore trong Lesson Service

**File:** `services/gateway-core/internal/services/lesson_service.go:156-159`

```go
var pacing domain.PacingConfig
_ = json.Unmarshal(row.PacingConfig, &pacing)  // Error bi bo qua

var chunks []domain.ScriptChunk
_ = json.Unmarshal(row.TranscriptChunks, &chunks)  // Error bi bo qua
```

**Van de:** Neu du lieu JSONB trong PostgreSQL bi corrupt hoac schema thay doi, unmarshal se fail silently — client nhan response voi du lieu trong ma khong co error message.

---

### [HIGH] BUG-ERR-03: Ollama Client - Translation fail tra ve chuoi rong khong co indicator

**File:** `services/script-llm/src/services/llm_pipeline.py:55-57`

```python
except Exception as err:
    logger.warning("Ollama unavailable for translation (%s).", str(err))
    return ""  # Translate fail = tra ve chuoi rong, caller khong biet
```

**Van de:** Khi Ollama unavailable, translation tra ve `""`. Caller tiep tuc tao chunks voi `target_text = ""` — lesson co chunks khong co ban dich ma khong co indicator nao cho client.

---

### [MEDIUM] BUG-ERR-04: Worker stop() khong close Redis connection

**File:** `services/audio-processor/src/main.py` va `services/tts-engine/src/main.py`

```python
consumer.stop()  # Chi set self.running = False, khong close Redis client
```

**Van de:** Redis client (`self.client`) khong duoc explicitly closed khi shutdown. `blpop` dang blocking trong worker thread — khi `self.running = False`, thread thoat nhung Redis connection van con open cho den khi GC collect.

---

## 6. PERFORMANCE — Van De Hieu Nang

### [HIGH] BUG-PERF-01: N+1 Query Pattern trong Asset Handlers

**File:** `services/gateway-core/internal/delivery/http/assets_handler.go:145-153`

```go
for _, qID := range []string{cleanUUID, lessonID, rawLessonID} {
    if l, err := h.lessonSvc.GetLessonByID(c.UserContext(), qID); err == nil && l != nil {
        // ...
    }
}
```

**Van de:** Handler thu den 3 queries DB cho cung 1 lesson voi 3 format ID khac nhau. Pattern nay xuat hien trong `resolveSrtPath`, `resolveAudioPath`, va `resolveAudioFilePath`. Moi request co the trigger 3-9 unnecessary DB queries.

---

### [HIGH] BUG-PERF-02: Large ZIP Archive duoc buffer toan bo vao RAM

**File:** `services/gateway-core/internal/delivery/http/assets_handler.go:287-335`

```go
case "zip":
    buf := new(bytes.Buffer)  // Buffer toan bo ZIP trong RAM
    w := zip.NewWriter(buf)
    // ...audio, srt, vtt, metadata...
    return c.Send(buf.Bytes())
```

**Van de:** Audio file co the lon (10-50MB). Toan bo ZIP archive duoc build trong `bytes.Buffer` tren heap truoc khi gui. Nhieu concurrent export requests co the gay memory spike.

**Fix:** Stream ZIP response truc tiep ve client thay vi buffer.

---

### [MEDIUM] BUG-PERF-03: Script-LLM config dung os.getenv() lan Pydantic Settings

**File:** `services/script-llm/src/config.py:28-34`

```python
class Settings(BaseSettings):
    ollama_host: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")  # Sai: dung os.getenv()
    llm_model: str = os.getenv("LLM_MODEL", "qwen3:8b")                    # Sai: dung os.getenv()
    redis_addr: str = os.getenv("REDIS_ADDR", "localhost:6379")             # Sai: dung os.getenv()
```

**Van de:** `BaseSettings` cua Pydantic da tu dong doc environment variables. Viec goi `os.getenv()` bypass validation cua Pydantic va tao ra hai nguon config co the conflict.

---

## 7. LOGIC BUGS — Loi Logic Nghiep Vu

### [HIGH] BUG-LOGIC-01: Sentence Chunking bo sot Trailing Content sau Abbreviation

**File:** `services/script-llm/src/services/script_tokenizer.py:79-93`

```python
for token in raw_tokens:
    current_sentence += token
    if re.search(r"[.!?]+(?:\s+|\n+|$)", token):
        ...
        if any(last_word.endswith(abbr) for abbr in COMMON_ABBREVIATIONS):
            continue  # BUG: khong reset current_sentence truoc khi continue
        sentences.append(candidate)
        current_sentence = ""
```

**Van de:** Khi gap abbreviation nhu `"v.v."`, code `continue` bo qua viec append sentence nhung **khong reset `current_sentence`**. Toan bo text sau abbreviation se bi accumulated vao sentence tiep theo, dan den cau rat dai va khong chinh xac.

---

### [HIGH] BUG-LOGIC-02: Audio Handler tao Lesson voi Placeholder Transcript Chunk

**File:** `services/gateway-core/internal/delivery/http/audio_handler.go:62-64`

```go
TranscriptChunks: []domain.ScriptChunk{
    {ID: "c1", Order: 1, Lang: req.SourceLanguage, Text: req.Title},
},
```

**Van de:** Handler tao lesson voi 1 chunk la title cua bai hoc. Sau khi `PARSING_DONE` event arrive, `TranscriptChunks` duoc override in-memory nhung lesson DB record van con chunk placeholder cu — inconsistent state giua DB va in-memory job.

---

### [MEDIUM] BUG-LOGIC-03: State Machine cho phep PENDING -> SYNTHESIZING (co the gay event timing issue)

**File:** `services/gateway-core/internal/orchestrator/state_machine.go:48`

```go
var validTransitions = map[JobState][]JobState{
    StatePending: {StateParsing, StateSynthesizing, StateFailed},
    ...
}
```

**Van de:** Neu `PARSING_DONE` event den tre sau khi job da o SYNTHESIZING, `HandleWorkerEvent` se co force transition `SYNTHESIZING -> SYNTHESIZING` hoac rollback state khong hop le.

---

### [MEDIUM] BUG-LOGIC-04: EstimatedRemainingSec nhan `totalWords=100` co dinh

**File:** `services/gateway-core/internal/orchestrator/pipeline_consumer.go:384`

```go
EstimatedRemainingSec: job.EstimatedRemainingSec(100),  // Hardcoded 100 words
```

**Van de:** Progress broadcast luon dung totalWords=100 co dinh, khong phu thuoc vao so tu thuc te cua job. Thoi gian uoc tinh hien thi cho user la **khong chinh xac**.

---

### [MEDIUM] BUG-LOGIC-05: Duration Estimation trong LLM Pipeline khong nhat quan

**File:** `services/script-llm/src/services/llm_pipeline.py:189-193`

```python
speech_sec = total_word_count / 2.3  # Flat 2.3 words/sec cho moi ngon ngu
pauses_sec = len(pairs) * 5.0
```

**Van de:** `llm_pipeline.py` dung 2.3 words/sec flat cho moi ngon ngu trong khi `metrics_estimator.py` dung WPM rieng cho vi/en/ja + configurable silence. Hai service se bao duration khac nhau cho cung 1 content.

---

## 8. CONFIGURATION & INFRASTRUCTURE

### [HIGH] BUG-INF-01: `go 1.27.1` khong ton tai

**File:** `services/gateway-core/go.mod:3`

```
go 1.27.1
```

**Van de:** Go 1.27 chua duoc release. Directive nay co the gay loi voi mot so Go toolchain versions hoac CI systems.

---

### [HIGH] BUG-INF-02: tts-engine thieu healthcheck, health endpoints khong nhat quan

**File:** `docker-compose.yml:173-221`

```yaml
# tts-engine-service: KHONG CO healthcheck
# script-llm check: /health (khong co /api/v1 prefix)
# audio-processor check: /api/v1/health (co prefix)
```

**Van de:** Khong nhat quan ve healthcheck URLs. `tts-engine-service` hoan toan khong co healthcheck.

---

### [MEDIUM] BUG-INF-03: NEXT_PUBLIC_API_URL dung localhost khi chay trong container

**File:** `docker-compose.yml:236`

```yaml
- NEXT_PUBLIC_API_URL=http://localhost:8000
- NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

**Van de:** `NEXT_PUBLIC_*` vars duoc embed vao browser bundle luc build. Khi Next.js server-side chay trong container, `localhost` tro vao container itself. Can phan biet `INTERNAL_API_URL` cho SSR va `NEXT_PUBLIC_API_URL` cho browser.

---

### [MEDIUM] BUG-INF-04: Database thieu Composite Index cho pagination queries

**File:** `services/gateway-core/init.sql`

**Van de:** `ListLessonsByUserID` likely ORDER BY `created_at DESC`. Khong co index tren `(user_id, created_at)` — full table scan voi large datasets. `learning_progress` cung thieu index tren `last_listened_at`.

---

## 9. FRONTEND — Next.js Web App

### [MEDIUM] BUG-FE-01: PlayerStore.seek() dung magic number 9999

**File:** `apps/web/src/stores/usePlayerStore.ts:97-100`

```typescript
const clampedTime = Math.max(0, Math.min(duration || 9999, time));  // 9999 = 165 phut
```

**Van de:** Neu `duration` la 0 (audio chua load), seek se clamp vao 9999. User co the seek den vi tri khong hop le.

---

### [MEDIUM] BUG-FE-02: setLesson khong reset audio/subtitle state cu

**File:** `apps/web/src/stores/usePlayerStore.ts:53-57`

```typescript
setLesson: (lesson) =>
    set({
      lesson,
      duration: lesson.durationSec || 0,
      // Khong reset: currentTime, subtitles, audioUrl, isPlaying, seekTarget, repeatCount
    }),
```

**Van de:** Khi chuyen sang bai hoc khac, cac state cu nhu `currentTime`, `subtitles`, `audioUrl`, `repeatCount` khong duoc reset. Player co the hien thi sai subtitle cua bai cu cho bai moi.

---

### [LOW] BUG-FE-03: Studio Store default title va resetStudio title khong khop

**File:** `apps/web/src/stores/useStudioStore.ts:37, 93`

```typescript
title: 'Bai hoc Shadowing - Giao tiep hang ngay',  // Initial
title: 'Bai hoc Shadowing moi',                      // After resetStudio()
```

**Van de:** Thieu single source of truth cho default values.

---

## 10. MISSING FEATURES / RISK KHI PHAT TRIEN TIEP

### [MEDIUM] RISK-01: Khong co Rate Limiting tren bat ky endpoint nao

**Van de:** Khong co rate limiting tren:
- `POST /auth/register` (brute force account creation)
- `POST /auth/guest` (spam DB voi guest records)
- `POST /audio/generate` (DoS attack via expensive TTS/LLM calls)
- `POST /api/v1/auto-chunk` tren script-llm (expensive Ollama calls)

---

### [MEDIUM] RISK-02: Khong co Cleanup Orphaned Storage Files khi xoa Lesson

**Van de:** Khi lesson bi delete, cac file trong shared storage (`/app/storage/audio/lesson_*.mp3`, subtitles) **khong duoc xoa** cung. `DeleteLesson` chi xoa DB record. Storage volume se tich luy orphaned files theo thoi gian.

**Fix:** Verify va implement storage cleanup logic trong `storage_cleanup.go`.

---

### [MEDIUM] RISK-03: Pagination silently clamp limit > 100 ve 10 khong bao client

**File:** `services/gateway-core/internal/services/lesson_service.go:197-199`

```go
if limit < 1 || limit > 100 {
    limit = 10  // Silent clamp, khong tra loi cho client
}
```

**Van de:** Client khong biet request cua ho bi modified.

---

## Tom Tat Uu Tien Fix

| Muc do    | So luong | Van de chinh |
|-----------|----------|--------------|
| CRITICAL  | 4        | CORS misconfiguration, JWT secret exposure, WebSocket data race, Job memory leak |
| HIGH      | 10       | Guest user DB spam, Redis error silencing, JSONB silent fail, N+1 queries, async worker races |
| MEDIUM    | 14       | Logic bugs, infrastructure config, frontend state issues, missing validations |
| LOW       | 1        | Minor UX inconsistencies |

---

## De Xuat Thu Tu Fix (Sprint Prioritization)

### Sprint A — Security & Stability (Uu tien ngay)
1. Fix CORS configuration tat ca services
2. Remove JWT secret fallback, require env var bat buoc
3. Fix WebSocket hub data race (`RLock` -> `Lock` trong broadcast case)
4. Implement in-memory job cleanup voi TTL

### Sprint B — Data Integrity (Truoc khi launch)
5. Fix placeholder audio/srt paths (tao files hoac dung nullable)
6. Fix silent Redis error ignoring trong pipeline
7. Fix JSON unmarshal error handling trong lesson service
8. Fix guest login DB explosion (chuyen sang ephemeral JWT)

### Sprint C — Performance & Logic (Sau launch)
9. Fix N+1 DB queries trong asset handlers
10. Fix word count estimation (`len/5` -> `strings.Fields`)
11. Fix sentence tokenizer abbreviation bug (reset `current_sentence` truoc `continue`)
12. Unify duration estimation logic giua LLM pipeline va metrics estimator
13. Add rate limiting middleware (Fiber limiter)
14. Add storage cleanup cho deleted lessons
15. Add composite DB indexes cho pagination

---

*Tai lieu nay duoc tao dua tren phan tich static code review toan bo source code cua project MeowShadow Lab tinh den ngay 2026-09-16.*
