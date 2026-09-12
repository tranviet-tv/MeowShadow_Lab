# KẾ HOẠCH TRIỂN KHAI DỰ ÁN THEO SPRINT (PROJECT SPRINT PLAN)
## DỰ ÁN: MEOWSHADOW LAB (MSL-SPRINT)
### LỘ TRÌNH 12 SPRINT VI MÔ: 100% DOCKER-FIRST, GOLANG GATEWAY, PYTHON WORKERS, NEXT.JS & REACT NATIVE

---

| Thông Tin Kế Hoạch | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `docs/5_SPRINT_PLAN.md` |
| **Phiên bản** | **3.2.0** (Cập nhật phân rã 12 Sprint vi mô) |
| **Mô hình triển khai** | **100% Docker-First Containerization (`docker compose up -d`)** |
| **Kiến trúc cốt lõi** | **Polyglot Microservices Monorepo: Golang Gateway + Python AI Workers + PostgreSQL 16 + Next.js 15 + React Native / Expo** |
| **Phương thức thực thi** | **12 Sprints linh hoạt (Pair-programming giữa User và Antigravity AI)** |
| **Tài liệu tham chiếu** | [1_SRS.md](./1_SRS.md) \| [2_ARCHITECTURE_TECHSTACK.md](./2_ARCHITECTURE_TECHSTACK.md) \| [3_DOCKER_CONTAINERIZATION.md](./3_DOCKER_CONTAINERIZATION.md) \| [4_API_AND_DATA_SCHEMAS.md](./4_API_AND_DATA_SCHEMAS.md) |

---

## 1. TỔNG QUAN LỘ TRÌNH 12 SPRINT THEO 5 GIAI ĐOẠN (ROADMAP OVERVIEW)

Toàn bộ quá trình phát triển được phân chia thành **5 Giai đoạn chiến lược (Phases)** gồm **12 Sprint vi mô (Micro-Sprints)**. Mỗi sprint kéo dài từ 1.5 đến 3 ngày, tập trung hoàn thiện một phân hệ kỹ thuật độc lập với các mốc kiểm thử định lượng và tiêu chuẩn nghiệm thu (**Definition of Done - DoD**) nghiêm ngặt.

```mermaid
gantt
    title LỘ TRÌNH 12 SPRINT TRIỂN KHAI MEOWSHADOW LAB
    dateFormat  YYYY-MM-DD
    axisFormat  %d/%m

    section Giai đoạn 1: Nền tảng & Audio
    Sprint 1: Monorepo & Shared Types           :done,    sp1, 2026-09-12, 2d
    Sprint 2: Docker Infra, Postgres & Redis    :done,    sp2, after sp1, 2d
    Sprint 3: Audio Pacing & Silence Engine     :active,  sp3, after sp2, 2d
    Sprint 4: FFmpeg Mastering & Subtitles      :         sp4, after sp3, 3d

    section Giai đoạn 2: AI & Tổng Hợp Giọng
    Sprint 5: Speech Synthesis & Smart Cache    :done,    sp5, after sp4, 3d
    Sprint 6: Script-LLM & NLP Pipeline         :active,  sp6, after sp5, 3d

    section Giai đoạn 3: Gateway & Streaming
    Sprint 7: Go Gateway & Database Layer       :         sp7, after sp6, 3d
    Sprint 8: Redis Pipeline & WebSockets       :         sp8, after sp7, 3d
    Sprint 9: HTTP 206 Streaming & Storage      :         sp9, after sp8, 2d

    section Giai đoạn 4: Web Studio
    Sprint 10: Next.js 15 Web & Script Editor   :         sp10, after sp9, 3d
    Sprint 11: Karaoke Player & Waveform Audio  :         sp11, after sp10, 3d

    section Giai đoạn 5: Mobile & Phát Hành
    Sprint 12: React Native Mobile & 1-Click    :         sp12, after sp11, 4d
```

### Ma Trận Tóm Tắt 5 Giai Đoạn Phát Triển

| Giai Đoạn | Mã Sprint | Trọng Tâm Kỹ Thuật | Thành Phần Mục Tiêu | Đầu Ra Định Lượng |
| :--- | :--- | :--- | :--- | :--- |
| **Giai đoạn 1: Nền Tảng & Audio Core** | **Sprint 1 – 4** | Khung Monorepo, Docker hạ tầng, Cơ sở dữ liệu, Thuật toán Pacing & Mastering EBU R128. | `packages/shared-types`, `docker-compose.yml`, `services/gateway-core/db/`, `services/audio-processor/` | Docker Compose chạy sạch sẽ Postgres/Redis; Render thử nghiệm file audio 10 phút chuẩn -16 LUFS kèm `.srt`. |
| **Giai đoạn 2: AI & Speech Synthesis** | **Sprint 5 – 6** | Tổng hợp đa ngữ Edge-TTS, Bộ nhớ đệm MD5, Phân đoạn tự động Qwen 2.5 LLM & Dịch thuật. | `services/tts-engine/`, `services/script-llm/` | 2 Worker AI hoạt động song song; Dịch và chia 1.500 từ trong < 10s, sinh giọng đọc trong < 15s. |
| **Giai đoạn 3: Gateway Core & Streaming** | **Sprint 7 – 9** | API Gateway Golang (Fiber/Gin), Điều phối tác vụ hàng đợi Redis, WebSocket Realtime & HTTP Range Streaming. | `services/gateway-core/` | Gateway `:8000` điều phối trơn tru end-to-end chuỗi render; Stream audio độ trễ tua < 100ms. |
| **Giai đoạn 4: Web Studio Trực Quan** | **Sprint 10 – 11** | Giao diện Web Studio Next.js 15, Bảng soạn thảo thẻ song ngữ, Trình phát Karaoke đồng bộ phụ đề & Waveform. | `apps/web/` | Web Studio `:3000` tương tác mượt mà, phản hồi WebSocket real-time, phím tắt hotkeys Space/J/L/R. |
| **Giai đoạn 5: Mobile & Phát Hành 1-Click** | **Sprint 12** | Ứng dụng di động React Native / Expo, Phát âm thanh chạy nền (Background Audio), Màn hình khóa, Offline Sync & Script `run.sh`. | `apps/mobile/`, `scripts/run.sh`, `Makefile` | Mobile App nghe được khi tắt màn hình; Kích hoạt toàn bộ hệ thống bằng đúng 1 câu lệnh duy nhất. |

---

## 2. CHI TIẾT TỪNG SPRINT (GRANULAR SPRINT BREAKDOWN)

---

### 📦 GIAI ĐOẠN 1: NỀN TẢNG HẠ TẦNG & BỘ MÁY XỬ LÝ ÂM THANH CỐT LÕI

#### 🏃 SPRINT 1: Monorepo Foundation, Shared Types & Tooling
* **Mục tiêu:** Thiết lập cấu trúc Monorepo tiêu chuẩn, quản lý gói bằng `pnpm`, định nghĩa bộ giao diện TypeScript dùng chung `@meowshadow/types` làm cầu nối giữa Web, Mobile và Backend Schemas.
* **Thời lượng dự kiến:** 1.5 – 2 ngày.
* **Mức độ ưu tiên:** P0 (Nền tảng bắt buộc).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP01-01** | Cấu trúc Monorepo & Tooling | - Cấu hình `pnpm-workspace.yaml`, `package.json`<br>- Thiết lập TypeScript Base Configs (`packages/tsconfig`)<br>- Cấu hình Biome/ESLint & Husky pre-commit hooks | `pnpm-workspace.yaml`<br>`packages/tsconfig/`<br>`packages/eslint-config/` | 0.5 ngày | ✅ Hoàn thành |
| **SP01-02** | Xây dựng `@meowshadow/types` | - Khai báo Interfaces: `ScriptChunk`, `LanguageTag`, `PacingConfig`, `VoiceConfig`<br>- Khai báo Schemas: `Lesson`, `JobProgress`, `AudioMetadata`, `WebSocketMessage` | `packages/shared-types/src/index.ts`<br>`packages/shared-types/package.json` | 0.5 ngày | ✅ Hoàn thành |
| **SP01-03** | Hoàn thiện Gói `@meowshadow/api-client` | - Thư viện HTTP Client (Fetch) & WebSocket wrapper dùng chung cho Web và Mobile, định kiểu từ `@meowshadow/types`, xuất dist sạch lỗi | `packages/api-client/` | 0.5 ngày | ✅ Hoàn thành |
| **SP01-04** | Kiểm thử Type Check & Build Toàn Repo | - Chạy `pnpm --filter @meowshadow/types build`<br>- Đảm bảo tất cả packages export types sạch lỗi | `packages/shared-types/tsconfig.json` | 0.2 ngày | ✅ Hoàn thành |

* **Định nghĩa hoàn thành (DoD - Sprint 1):**
  - Gói `@meowshadow/types` và `@meowshadow/api-client` biên dịch thành công file `.d.ts` và `.js` ra thư mục `dist/`.
  - Không có lỗi type checking (`pnpm type-check` pass 100%).

---

#### 🏃 SPRINT 2: Docker Infrastructure, PostgreSQL Schema & Redis Broker
* **Mục tiêu:** Đóng gói môi trường cơ sở dữ liệu và message broker với `docker-compose.yml`, tạo cấu trúc bảng dữ liệu PostgreSQL 16 (Users, Lessons, Progress) với Goose migrations và nạp dữ liệu mẫu 1.500 từ.
* **Thời lượng dự kiến:** 2 ngày.
* **Mức độ ưu tiên:** P0 (Nền tảng hạ tầng).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP02-01** | Tối ưu Hóa `docker-compose.yml` | - Phân tách Profiles: `db`, `tools`, `services`, `full`<br>- Khởi tạo Volumes: `postgres-data`, `redis-data`, `storage-data`<br>- Cấu hình Bridge Network `meowshadow-network` | `docker-compose.yml`<br>`.env.example` | 0.5 ngày | ✅ Hoàn thành |
| **SP02-02** | Khởi tạo Goose SQL Migrations | - `00001_init_extensions.sql` (uuid-ossp, pgvector)<br>- `00002_create_users_tables.sql`<br>- `00003_create_lessons_tables.sql` (JSONB chunks, GIN index)<br>- `00004_create_progress_tables.sql` | `services/gateway-core/db/migrations/`<br>`services/gateway-core/Dockerfile.migration` | 0.5 ngày | ✅ Hoàn thành |
| **SP02-03** | Cấu hình Redis Broker & Adminer Studio | - Thiết lập Redis 7 AOF persistence cho Message Queue<br>- Đưa container Adminer Web Studio (`:8080`) vào profile `tools` | `docker-compose.yml`<br>`services/gateway-core/init.sql` | 0.3 ngày | ✅ Hoàn thành |
| **SP02-04** | Bộ Dữ Liệu Mẫu (Seed Data 1.500 từ) | - Nạp 2 bài học mẫu chuẩn 1.500 từ (EN/VI và JA/VI) qua `00002_sample_1500w_lessons.sql` tuân thủ nghiêm ngặt quy chuẩn Tiếng Việt đọc trước, Ngoại ngữ đọc sau kèm các mốc pacing | `services/gateway-core/db/seeds/` | 0.4 ngày | ✅ Hoàn thành |
| **SP02-05** | Kiểm tra Health Check & Reset Database | - Bổ sung lệnh `make db-reset` vào `Makefile`; Chạy kiểm thử tự động toàn diện trên Docker thành công 100% | `Makefile` | 0.3 ngày | ✅ Hoàn thành |

* **Định nghĩa hoàn thành (DoD - Sprint 2):**
  - Chạy `docker compose up -d postgres-db redis-broker` đạt trạng thái `healthy`.
  - Thực thi migration `docker compose --profile migration up` áp dụng thành công 100% migrations vào cơ sở dữ liệu.
  - Truy cập Adminer tại `http://localhost:8080` xem được đầy đủ 4 bảng và dữ liệu seed.

---

#### 🏃 SPRINT 3: Audio Processor Service - Pacing & Silence Engine
* **Mục tiêu:** Xây dựng service Python FastAPI `services/audio-processor` chịu trách nhiệm tạo khoảng lặng kỹ thuật số chuẩn mili-giây (`silence_generator.py`) và thuật toán định nhịp xen kẽ (`pacing_builder.py`): 1.5s sau tiếng Việt, 3.5s sau tiếng Anh/Nhật, 0.5s giữa các câu.
* **Thời lượng dự kiến:** 2 ngày.
* **Mức độ ưu tiên:** P0 (Cốt lõi thuật toán Shadowing).

> [!IMPORTANT]
> **Quy Chuẩn Bắt Buộc Thứ Tự Phát (Mandatory Audio Sequencing: Tiếng Việt Đọc Trước):**
> Mọi file audio đầu ra của hệ thống BẮT BUỘC đọc câu Tiếng Việt trước (`[VI]`), sau đó đến khoảng lặng 1.5s (kèm âm thanh Chime), tiếp đến mới đọc câu Ngoại ngữ (`[EN]` hoặc `[JA]`), và cuối cùng là khoảng lặng 3.5s để người học nhại giọng Shadowing.

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP03-01** | Khởi tạo Khung Service `audio-processor` | - Khởi tạo FastAPI App, cấu hình `config.py` đọc biến môi trường<br>- Khai báo Pydantic schemas: `ProcessRequest`, `PacingParams`, `AudioClipItem` | `services/audio-processor/src/main.py`<br>`services/audio-processor/src/config.py`<br>`services/audio-processor/src/schemas/` | 0.4 ngày | ✅ Hoàn thành |
| **SP03-02** | Module Tạo Khoảng Lặng Kỹ Thuật Số | - Viết `silence_generator.py` dùng `pydub.AudioSegment.silent` tạo audio im lặng với độ dài chính xác từng mili-giây | `services/audio-processor/src/services/silence_generator.py` | 0.4 ngày | ✅ Hoàn thành |
| **SP03-03** | Thuật Toán Định Nhịp Pacing Builder | - Viết `pacing_builder.py`: Lắp ghép chuỗi theo cấu trúc `VI -> 1.5s Silence -> EN/JA -> 3.5s Silence -> 0.5s Inter-chunk`<br>- Hỗ trợ tùy biến tham số khoảng lặng linh hoạt từ request | `services/audio-processor/src/services/pacing_builder.py` | 0.6 ngày | ✅ Hoàn thành |
| **SP03-04** | Chèn Âm Thanh Báo Hiệu (Transition Cue) | - Tạo âm thanh hiệu ứng "chime" nhẹ nhàng phân cách giữa hai ngôn ngữ khi người dùng bật tùy chọn | `services/audio-processor/src/services/pacing_builder.py`<br>`assets/audio/chime.wav` | 0.3 ngày | ✅ Hoàn thành |
| **SP03-05** | Bộ Kiểm Thử Đơn Vị Pacing & Silence | - Viết unit test Pytest kiểm tra độ dài chính xác của từng phân đoạn âm thanh sau khi chèn khoảng lặng, kiểm tra PCM buffer zero-byte và tính toàn vẹn của timeline | `services/audio-processor/tests/test_silence_generator.py`<br>`services/audio-processor/tests/test_pacing_builder.py` | 0.3 ngày | ✅ Hoàn thành |

* **Định nghĩa hoàn thành (DoD - Sprint 3):**
  - Tất cả 27 bài kiểm thử Pytest trong `services/audio-processor/tests/` chạy thành công (`100% pass`).
  - Hàm ghép nối pacing tạo ra chuỗi audio có sai số thời lượng khoảng lặng không vượt quá $\pm 1$ mili-giây (vượt chuẩn DoD $\pm 5$ mili-giây).
  - Khung thời gian Timeline liên tục 100%, không bị hổng (gap) hoặc chồng lấn (overlap) giữa các phân đoạn.

---

#### 🏃 SPRINT 4: Audio Processor Service - FFmpeg Mastering & Subtitles Engine
* **Mục tiêu:** Hoàn thiện khâu mastering âm thanh chuẩn phát thanh quốc tế **EBU R128 (-16 LUFS)** bằng FFmpeg, trích xuất dữ liệu đỉnh sóng âm (Waveform peaks), và tính toán mốc thời gian xuất file phụ đề `.srt` và `.vtt` khớp 100%.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Chất lượng âm thanh chuẩn Podcast).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP04-01** | Module Nối Clips & Mastering EBU R128 | - Viết `audio_master.py` gọi FFmpeg nối audio clips không mất chất lượng<br>- Áp dụng bộ lọc `loudnorm=I=-16:LRA=7:tp=-1.5`<br>- Áp dụng Fade-in (0.5s) đầu bài và Fade-out (1.0s) cuối bài | `services/audio-processor/src/services/audio_master.py` | 0.8 ngày | ✅ Hoàn thành |
| **SP04-02** | Engine Sinh Phụ Đề Chuẩn Xác SRT & VTT | - Viết `subtitle_engine.py`: Đo duration thực tế từng clip<br>- Tính toán mốc `start_time` và `end_time` xuất file `.srt` và `.vtt`<br>- Đảm bảo mốc thời gian phụ đề khớp hoàn toàn với câu đang đọc | `services/audio-processor/src/services/subtitle_engine.py` | 0.6 ngày | ✅ Hoàn thành |
| **SP04-03** | Trích Xuất Dữ Liệu Sóng Âm (Waveform Peaks) | - Viết `waveform_builder.py`: Tạo mảng JSON 100–200 điểm đỉnh âm (amplitude peaks) phục vụ hiển thị visualizer trên UI | `services/audio-processor/src/services/waveform_builder.py` | 0.4 ngày | ✅ Hoàn thành |
| **SP04-04** | API Endpoint & Worker Redis Consumer | - Endpoint `POST /api/v1/process` phục vụ test trực tiếp qua HTTP<br>- Worker `consumer.py` lắng nghe task `AUDIO_MASTERING` từ Redis queue | `services/audio-processor/src/api/v1/endpoints/process.py`<br>`services/audio-processor/src/workers/consumer.py` | 0.5 ngày | ✅ Hoàn thành |
| **SP04-05** | Đóng Gói Dockerfile & Thử Nghiệm Bài 10 Phút | - Dockerfile đa tầng cài sẵn FFmpeg 6+ và Python 3.11<br>- Chạy render thực tế bài viết mẫu 1.500 từ ra file `lesson.mp3` và `lesson.srt` | `services/audio-processor/Dockerfile`<br>`services/audio-processor/tests/test_audio_master.py`<br>`services/audio-processor/tests/test_full_lesson_simulation.py` | 0.5 ngày | ✅ Hoàn thành |

* **Định nghĩa hoàn thành (DoD - Sprint 4):**
  - ✅ Container `audio-processor-service` khởi chạy trên Docker (`:8003`), healthcheck báo `healthy` (`HTTP 200 OK`).
  - ✅ File `lesson.mp3` đầu ra đạt chuẩn EBU R128 (-16.0 LUFS $\pm 0.5$, True Peak $\le -1.5\text{ dBFS}$).
  - ✅ File phụ đề `.srt` và `.vtt` khớp tiếng 100%, timeline liên tục, zero drift.
  - ✅ 57/57 tests Pytest chạy thành công trên cả môi trường host (`make test-audio`) và Docker container (`make test-audio-docker`).

---

### 🧠 GIAI ĐOẠN 2: TRÍ TUỆ NHÂN TẠO (AI) & TỔNG HỢP GIỌNG NÓI

#### 🏃 SPRINT 5: Speech Synthesis Worker (Edge-TTS & Smart Caching)
* **Mục tiêu:** Xây dựng service Python FastAPI `services/tts-engine` tích hợp Microsoft Edge Neural TTS đa ngôn ngữ (VI, EN, JA), xử lý bất đồng bộ song song nhiều câu (`asyncio.gather`), và thuật toán Smart Caching mã băm MD5 để tối ưu hóa tốc độ.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Trọng yếu tạo âm thanh).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP05-01** | Khởi tạo Khung Service `tts-engine` | - Khởi tạo FastAPI App, cấu hình `config.py` (`STORAGE_DIR`, `REDIS_ADDR`)<br>- Khai báo danh mục Voices chuẩn: `vi-VN-HoaiMyNeural`, `en-US-JennyNeural`, `ja-JP-NanamiNeural` | `services/tts-engine/src/main.py`<br>`services/tts-engine/src/config.py`<br>`services/tts-engine/src/schemas/tts.py` | 0.4 ngày | 🟢 Hoàn thành |
| **SP05-02** | Module Edge-TTS Synthesis Bất Đồng Bộ | - Viết `edge_engine.py` gọi thư viện `edge-tts`<br>- Hỗ trợ điều chỉnh tốc độ đọc (`--rate=+0%`), cao độ (`--pitch=+0Hz`)<br>- Xử lý song song danh sách câu với `asyncio.gather` và kiểm soát concurrency limiter | `services/tts-engine/src/services/edge_engine.py` | 0.8 ngày | 🟢 Hoàn thành |
| **SP05-03** | Smart Caching Engine Băm Mã MD5 | - Viết `cache_manager.py`: Tính `hash = md5(text + voice_id + rate + pitch)`<br>- Kiểm tra file cache tồn tại trước khi gọi TTS, giúp tăng tốc tái sử dụng 100x | `services/tts-engine/src/services/cache_manager.py` | 0.4 ngày | 🟢 Hoàn thành |
| **SP05-04** | Redis Worker Consumer & Job Dispatcher | - Lắng nghe task `TTS_SYNTHESIS` từ Redis Stream / Queue<br>- Tự động chia nhỏ mảng câu, tổng hợp đồng loạt và đẩy kết quả đường dẫn clips về Redis | `services/tts-engine/src/workers/tts_worker.py` | 0.5 ngày | 🟢 Hoàn thành |
| **SP05-05** | Dockerfile & Đánh Giá Tốc Độ Render | - Dockerfile tối ưu hóa kích thước cho `tts-engine`<br>- Benchmark: Tổng hợp 100 câu ngắn dưới **15 giây** với tỷ lệ lỗi < 0.1% | `services/tts-engine/Dockerfile`<br>`services/tts-engine/tests/test_tts_speed.py` | 0.5 ngày | 🟢 Hoàn thành |

* **Định nghĩa hoàn thành (DoD - Sprint 5):**
  - Container `tts-engine-service` khởi chạy trên Docker (`:8002`).
  - Gửi request tổng hợp 50 câu song ngữ trả về danh sách 50 file `.mp3` clip trong thư mục storage; Gọi lần 2 phản hồi tức thì dưới 50ms nhờ MD5 Cache.

---

#### 🏃 SPRINT 6: Script-LLM Worker (Ollama Qwen 2.5 & NLP Pipeline)
* **Mục tiêu:** Xây dựng service Python FastAPI `services/script-llm` kết nối Ollama (Qwen 2.5 14B/7B), tự động phân tích cấu trúc bài viết thô, phân đoạn logic 3–4 câu song ngữ (`[VI] - [EN]` hoặc `[VI] - [JA]`), và hỗ trợ dịch thuật chuẩn ngữ cảnh.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P1 (Trợ thủ AI thông minh).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP06-01** | Khởi tạo Khung Service `script-llm` | - FastAPI App, cấu hình `OLLAMA_HOST=http://host.docker.internal:11434`<br>- Định nghĩa schemas: `ParseRequest`, `ChunkPair`, `TranslateRequest` | `services/script-llm/src/main.py`<br>`services/script-llm/src/config.py`<br>`services/script-llm/src/schemas/` | 0.4 ngày | 🟢 Hoàn thành |
| **SP06-02** | Regex Tokenizer & Tag Parser | - Viết `script_tokenizer.py`: Bóc tách triệt để các thẻ cú pháp `[VI]`, `[EN]`, `[JA]`<br>- Chuẩn hóa ký tự khoảng trắng, ngắt dòng và dấu câu | `services/script-llm/src/services/script_tokenizer.py` | 0.5 ngày | 🟢 Hoàn thành |
| **SP06-03** | Tích Hợp Ollama Qwen 2.5 Prompt Engine | - Viết `llm_pipeline.py`: Xây dựng System Prompt tối ưu hóa cho Qwen 2.5<br>- Tính năng 1: Tự động phân đoạn bài viết 1.500 từ thành các cặp 3–4 câu trọn vẹn ngữ nghĩa<br>- Tính năng 2: Dịch tự động một chiều VI $\rightarrow$ EN/JA hoặc EN/JA $\rightarrow$ VI | `services/script-llm/src/services/llm_pipeline.py`<br>`services/script-llm/src/prompts/chunking.py` | 0.8 ngày | ⚪ Chờ thực hiện |
| **SP06-04** | Bộ Đo Đạc & Dự Đoán Thời Lượng Audio | - Viết `metrics_estimator.py`: Đếm số từ, ước tính độ dài đọc dựa trên WPM (Words Per Minute) và tham số khoảng lặng Pacing | `services/script-llm/src/services/metrics_estimator.py` | 0.4 ngày | ⚪ Chờ thực hiện |
| **SP06-05** | Dockerfile & Kiểm Thử Xử Lý Kịch Bản Thô | - Viết Dockerfile hỗ trợ kết nối `host.docker.internal`<br>- Kiểm thử phân đoạn bài viết mẫu không làm rớt chữ hoặc sai cú pháp | `services/script-llm/Dockerfile`<br>`services/script-llm/tests/test_parser.py` | 0.5 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 6):**
  - Container `script-llm-service` chạy trên cổng `:8001`.
  - Nhận một đoạn văn thô 1.500 từ, tự động xuất ra mảng JSON `ScriptChunk[]` chuẩn xác 100% cấu trúc, sẵn sàng đưa vào hàng đợi tổng hợp giọng nói.

---

### 🚀 GIAI ĐOẠN 3: GOLANG GATEWAY CORE, ĐIỀU PHỐI TÁC VỤ & STREAMING

#### 🏃 SPRINT 7: Golang Core Gateway - Architecture & Database Layer
* **Mục tiêu:** Xây dựng khung API Gateway bằng **Golang (Fiber v2)** hiệu năng cao, kết nối PostgreSQL 16 qua `pgxpool`, tích hợp các truy vấn type-safe do `sqlc` sinh ra, và cung cấp đầy đủ API xác thực (JWT Auth) cùng CRUD bài học.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Trục xương sống Backend).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP07-01** | Khởi tạo Khung Ứng Dụng Go Fiber | - Khởi tạo `cmd/server/main.go`, cấu hình Fiber App<br>- Cài đặt Middleware: Logger, CORS, Recovery, Rate-limiter | `services/gateway-core/cmd/server/main.go`<br>`services/gateway-core/config/config.go`<br>`services/gateway-core/internal/middleware/` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP07-02** | Tích Hợp `pgx/v5` & `sqlc` Query Engine | - Cấu hình connection pool `pgxpool` tối ưu kết nối<br>- Sinh mã Go từ các file SQL bằng `sqlc generate`<br>- Xây dựng Database Repository hoàn chỉnh | `services/gateway-core/internal/repository/`<br>`services/gateway-core/sqlc.yaml` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP07-03** | Phân Hệ Xác Thực & Quản Lý Phiên (JWT) | - Endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`<br>- Hỗ trợ Guest Mode (phiên khách tạm thời không cần đăng ký tài khoản)<br>- JWT Middleware bảo vệ các endpoint người dùng | `services/gateway-core/internal/api/v1/handlers/auth.go`<br>`services/gateway-core/internal/services/auth_service.go` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP07-04** | RESTful CRUD API Quản Lý Bài Học | - Endpoints: `GET /api/v1/lessons`, `POST /api/v1/lessons`, `GET /api/v1/lessons/:id`, `DELETE /api/v1/lessons/:id`<br>- Lưu trữ nội dung kịch bản cấu trúc vào cột JSONB `chunks` | `services/gateway-core/internal/api/v1/handlers/lessons.go`<br>`services/gateway-core/internal/services/lesson_service.go` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP07-05** | Dockerfile Đa Tầng Cho Go Gateway | - Dockerfile multi-stage (`golang:1.22-alpine` build -> `alpine` scratch) siêu nhẹ (< 20MB) | `services/gateway-core/Dockerfile` | 0.3 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 7):**
  - Container `gateway-core` khởi chạy trên Docker (`:8000`), kết nối thành công `postgres-db`.
  - Test luồng đăng ký, đăng nhập và tạo mới bài học qua Postman/cURL phản hồi mã trạng thái `200/201 OK`.

---

#### 🏃 SPRINT 8: Pipeline Orchestration & Realtime WebSockets Hub
* **Mục tiêu:** Xây dựng bộ máy điều phối (Pipeline Orchestrator) quản lý toàn bộ chuỗi render bất đồng bộ qua Redis, theo dõi tiến độ công việc và phát sóng thời gian thực về giao diện Web/Mobile qua WebSocket Hub.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Điều phối luồng dữ liệu).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP08-01** | Redis Queue & Task State Machine | - Xây dựng State Machine trong Go: `PENDING -> PARSING -> SYNTHESIZING -> MASTERING -> READY / FAILED`<br>- Dispatch tác vụ tuần tự vào các Redis Stream / Channel tương ứng | `services/gateway-core/internal/orchestrator/state_machine.go`<br>`services/gateway-core/internal/queue/redis_producer.go` | 0.8 ngày | ⚪ Chờ thực hiện |
| **SP08-02** | Kết Nối Worker Responses & Cập Nhật DB | - Consumer trong Go lắng nghe sự kiện hoàn thành từ các Python Workers<br>- Cập nhật trạng thái bài học, đường dẫn file audio MP3 và file phụ đề SRT vào PostgreSQL | `services/gateway-core/internal/orchestrator/pipeline_consumer.go` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP08-03** | Kênh WebSocket Hub Thời Gian Thực | - Xây dựng WebSocket Hub: `/ws/progress?job_id=xxx` hoặc `/ws/lessons/:id`<br>- Quản lý clients kết nối, broadcast % hoàn thành (0% $\rightarrow$ 100%) và thời gian ước tính còn lại | `services/gateway-core/internal/websocket/hub.go`<br>`services/gateway-core/internal/websocket/client.go` | 0.7 ngày | ⚪ Chờ thực hiện |
| **SP08-04** | Dispatcher Thông Báo Đẩy (FCM / APNs) | - Xây dựng module gửi Push Notification tới thiết bị Mobile khi quá trình render hoàn tất | `services/gateway-core/internal/notifications/push_dispatcher.go` | 0.4 ngày | ⚪ Chờ thực hiện |
| **SP08-05** | Kiểm Thử Tích Hợp Luồng Render Toàn Diện | - Chạy test tích hợp end-to-end từ lúc nhận lệnh tạo bài học đến khi nhận thông điệp 100% qua WebSocket | `services/gateway-core/tests/integration_pipeline_test.go` | 0.4 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 8):**
  - Kết nối WebSocket bằng công cụ test nhận đủ các sự kiện tiến trình: `15% (Parsed) -> 60% (TTS Done) -> 90% (Mastered) -> 100% (Completed)`.
  - Tự động bắt lỗi và đánh dấu `FAILED` nếu có bất kỳ worker nào bị ngắt kết nối đột ngột.

---

#### 🏃 SPRINT 9: High-Performance Audio Streaming & Storage Engine
* **Mục tiêu:** Cung cấp endpoint phát âm thanh chuẩn **HTTP Range Requests (`206 Partial Content`)**, cho phép trình phát Web và Mobile bắt đầu nghe trong vòng < 100ms và tua tức thì đến bất kỳ vị trí nào mà không cần tải lại toàn bộ file.
* **Thời lượng dự kiến:** 1.5 – 2 ngày.
* **Mức độ ưu tiên:** P0 (Trải nghiệm nghe mượt mà không độ trễ).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP09-01** | HTTP Range Audio Streaming Server | - Xây dựng endpoint `GET /api/v1/audio/stream/:lesson_id`<br>- Xử lý header `Range: bytes=start-end`, trả về mã `206 Partial Content`<br>- Đảm bảo tương thích tuyệt đối với trình duyệt Safari, Chrome và iOS AVPlayer | `services/gateway-core/internal/api/v1/handlers/audio_stream.go` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP09-02** | Static Asset Server (SRT, VTT, Peaks JSON) | - Endpoints phân phối file phụ đề: `GET /api/v1/lessons/:id/subtitles.srt`<br>- Endpoints phân phối file WebVTT: `GET /api/v1/lessons/:id/subtitles.vtt`<br>- Endpoint lấy dữ liệu sóng âm: `GET /api/v1/lessons/:id/waveform.json` | `services/gateway-core/internal/api/v1/handlers/assets.go` | 0.4 ngày | ⚪ Chờ thực hiện |
| **SP09-03** | Cơ Chế Dọn Dẹp File Rác (Storage Retention) | - Background worker định kỳ quét và xóa các file tạm hoặc bài học bị hủy sau 24 giờ | `services/gateway-core/internal/services/storage_cleanup.go` | 0.3 ngày | ⚪ Chờ thực hiện |
| **SP09-04** | Swagger / OpenAPI 3.0 Documentation | - Tự động sinh tài liệu API tương tác bằng Swagger UI tại `http://localhost:8000/swagger` | `services/gateway-core/docs/` | 0.3 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 9):**
  - Lệnh `curl -i -H "Range: bytes=0-1024" http://localhost:8000/api/v1/audio/stream/xxx` trả về đúng header `HTTP/1.1 206 Partial Content` và `Content-Range: bytes 0-1024/total`.
  - Tua audio trên trình duyệt bắt đầu phát lại ngay trong < 100ms.

---

### 💻 GIAI ĐOẠN 4: NEXT.JS 15 WEB STUDIO & TRÌNH PHÁT KARAOKE TƯƠNG TÁC

#### 🏃 SPRINT 10: Next.js 15 Web Studio - Script Editor & Pacing Studio
* **Mục tiêu:** Xây dựng ứng dụng Web hiện đại bằng **Next.js 15 App Router, TypeScript, Tailwind CSS**, tích hợp Trình soạn thảo kịch bản song ngữ với cú pháp thẻ trực quan (`[VI]`, `[EN]`, `[JA]`), thanh điều chỉnh nhịp điệu Pacing và tính năng nghe thử từng câu.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Giao diện người dùng chính).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP10-01** | Khởi tạo Khung Next.js 15 App Router | - Cài đặt Next.js 15, Tailwind CSS, Lucide React Icons, Zustand<br>- Cấu hình Dark/Light Mode, chia sẻ `@meowshadow/types` | `apps/web/src/app/`<br>`apps/web/package.json`<br>`apps/web/tailwind.config.ts` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP10-02** | Trình Soạn Thảo Kịch Bản Song Ngữ | - Xây dựng `ScriptEditor.tsx` hỗ trợ 2 chế độ: Xen kẽ (Interleaved) và Song song (Side-by-side)<br>- Syntax highlighting nổi bật các thẻ `[VI]`, `[EN]`, `[JA]`<br>- Bộ đếm số từ và ước tính thời lượng audio trực tiếp khi gõ phím | `apps/web/src/components/studio/ScriptEditor.tsx`<br>`apps/web/src/components/studio/WordCounter.tsx` | 0.8 ngày | ⚪ Chờ thực hiện |
| **SP10-03** | Bảng Điều Khiển Pacing & Voice Selector | - Xây dựng `PacingController.tsx`: Thanh trượt chỉnh khoảng lặng VI (1.5s), EN/JA (3.5s)<br>- `VoiceSelector.tsx`: Danh sách chọn giọng Nam/Nữ kèm nút "Nghe thử giọng này" | `apps/web/src/components/studio/PacingController.tsx`<br>`apps/web/src/components/studio/VoiceSelector.tsx` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP10-04** | Tích Hợp Nút "AI Auto-Translate & Chunk" | - Nút gọi trực tiếp Script-LLM Worker phân đoạn bài viết tự động trong 1 click | `apps/web/src/components/studio/AIActionBar.tsx` | 0.4 ngày | ⚪ Chờ thực hiện |
| **SP10-05** | Dockerfile Tối Ưu Hóa Multi-Stage Cho Web | - Viết `apps/web/Dockerfile` xuất bản image standalone production | `apps/web/Dockerfile` | 0.3 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 10):**
  - Web chạy tại `http://localhost:3000`, thiết kế giao diện Dark Mode cao cấp.
  - Người dùng dán bài viết thô, bấm nút AI tự động phân tách thành các cặp câu song ngữ chuẩn đẹp mắt.

---

#### 🏃 SPRINT 11: Interactive Karaoke Player & Waveform Audio Experience
* **Mục tiêu:** Xây dựng Trình phát âm thanh tương tác **KaraokePlayer**, tự động cuộn và làm nổi bật câu đang đọc theo thời gian thực, hiển thị dạng sóng âm tương tác (Waveform Visualizer), hỗ trợ phím tắt (`Space`, `J`/`L`, `R`) và Modal theo dõi tiến trình WebSocket.
* **Thời lượng dự kiến:** 2.5 – 3 ngày.
* **Mức độ ưu tiên:** P0 (Trải nghiệm học tập cốt lõi).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP11-01** | Trình Phát Âm Thanh Đồng Bộ Phụ Đề | - Xây dựng `KaraokePlayer.tsx`: Tự động cuộn theo thời gian thực<br>- Highlight câu Tiếng Việt và Ngoại ngữ tương ứng với âm thanh đang phát<br>- Bấm vào bất kỳ câu nào để tua audio ngay lập tức đến mốc thời gian đó | `apps/web/src/components/player/KaraokePlayer.tsx`<br>`apps/web/src/components/player/SubtitleLine.tsx` | 0.8 ngày | ⚪ Chờ thực hiện |
| **SP11-02** | Trực Quan Hóa Sóng Âm (Waveform Visualizer) | - Tích hợp Wavesurfer hoặc Canvas Visualizer dựa trên dữ liệu JSON peaks<br>- Hiển thị tiến trình phát trực quan, hỗ trợ kéo thả tua sóng âm | `apps/web/src/components/player/WaveformVisualizer.tsx` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP11-03** | Hệ Thống Phím Tắt Điều Khiển (Hotkeys) | - `Space`: Tạm dừng / Tiếp tục phát<br>- `J` / `L`: Tua lùi / Tua tới 5 giây<br>- `R`: **Lặp lại câu hiện tại (Repeat Chunk)** phục vụ nhại giọng Shadowing | `apps/web/src/hooks/usePlayerHotkeys.ts` | 0.4 ngày | ⚪ Chờ thực hiện |
| **SP11-04** | Modal Tiến Trình Render WebSocket | - Hiển thị Modal với các hiệu ứng động thể hiện từng bước render sống động<br>- Tự động đóng modal và nạp bài học vào Player khi nhận tín hiệu hoàn tất | `apps/web/src/components/studio/RenderProgressModal.tsx` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP11-05** | Modal Xuất Trọn Gói Tài Liệu (Export Hub) | - Cho phép người dùng tải nhanh: File `.mp3`, File `.srt`, File `.vtt` hoặc tải trọn gói `.zip` | `apps/web/src/components/player/ExportModal.tsx` | 0.4 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 11):**
  - Trình phát Karaoke chạy mượt mà, câu đọc tới đâu chữ sáng tới đó, không lệch phụ đề.
  - Phím tắt `R` hoạt động chính xác: tua ngược về đúng đầu câu đang học và phát lại.

---

### 📱 GIAI ĐOẠN 5: REACT NATIVE MOBILE APP, OFFLINE SYNC & PHÁT HÀNH 1-CLICK

#### 🏃 SPRINT 12: React Native Mobile App, Offline Sync & 1-Click Launch
* **Mục tiêu:** Xây dựng ứng dụng di động **React Native / Expo (TypeScript)** với tính năng phát âm thanh chạy nền (**Background Audio**), điều khiển ngoài màn hình khóa (**Lock-screen Player**), tải bài học để nghe **Offline** với SQLite, và hoàn thiện bộ kịch bản khởi chạy toàn hệ thống trong 1 cú nhấp chuột (`run.sh`).
* **Thời lượng dự kiến:** 3.5 – 4 ngày.
* **Mức độ ưu tiên:** P0 (Hoàn tất mục tiêu đa nền tảng).

| Mã Task | Tên Công Việc | Chi Tiết Kỹ Thuật | File Tác Động | Ước Tính | Trạng Thái |
| :--- | :--- | :--- | :--- | :---: | :---: |
| **SP12-01** | Khởi tạo Khung Expo Mobile App | - Khởi tạo Expo App trong `apps/mobile/`, tích hợp `@meowshadow/types`<br>- Thiết lập Bottom Tab Navigation: Thư viện bài học, Trình phát, Cài đặt | `apps/mobile/src/App.tsx`<br>`apps/mobile/src/navigation/`<br>`apps/mobile/package.json` | 0.6 ngày | ⚪ Chờ thực hiện |
| **SP12-02** | Dịch Vụ Background Audio & Lock-Screen | - Tích hợp Audio Player Native (`react-native-track-player` / `expo-av`)<br>- Tiếp tục phát âm thanh liên tục khi khóa màn hình điện thoại<br>- Hiển thị thanh Player trên màn hình khóa điện thoại kèm nút "Repeat Chunk" | `apps/mobile/src/services/audioService.ts`<br>`apps/mobile/src/components/LockScreenPlayer.tsx` | 1.0 ngày | ⚪ Chờ thực hiện |
| **SP12-03** | Tải Bài Học Về Máy (Offline Sync SQLite) | - Tải file `.mp3` và `.srt` vào bộ nhớ cục bộ của điện thoại<br>- Lưu cấu trúc bài học vào Expo SQLite / OP-SQLite<br>- Tự động đồng bộ lịch sử luyện nghe lên máy chủ PostgreSQL khi có mạng | `apps/mobile/src/services/offlineManager.ts`<br>`apps/mobile/src/db/sqlite.ts` | 0.8 ngày | ⚪ Chờ thực hiện |
| **SP12-04** | Hỗ Trợ Local AI TTS (Kokoro / Fish-Speech) | - Cấu hình tùy chọn chuyển sang engine AI TTS chạy Offline trên máy cục bộ | `services/tts-engine/src/services/kokoro_engine.py` | 0.5 ngày | ⚪ Chờ thực hiện |
| **SP12-05** | Kịch Bản 1-Click Launch & Kiểm Thử E2E | - Hoàn thiện script `scripts/run.sh` và `Makefile`<br>- Chỉ cần 1 lệnh: tự động kiểm tra Docker, chạy migrations, seed dữ liệu và mở trình duyệt<br>- Kiểm thử toàn diện trên Web Chrome, iPhone (iOS Simulator) và Android Emulator | `scripts/run.sh`<br>`Makefile`<br>`README.md` | 0.8 ngày | ⚪ Chờ thực hiện |

* **Định nghĩa hoàn thành (DoD - Sprint 12):**
  - Chạy `./scripts/run.sh` kích hoạt 100% hệ thống không gặp bất kỳ lỗi nào.
  - Ứng dụng Mobile phát bài học trơn tru khi tắt màn hình, bấm nút lặp lại câu trên tai nghe/màn hình khóa phản hồi lập tức.
  - Toàn bộ dự án chính thức sẵn sàng bàn giao phiên bản v3.2.0.

---

## 3. BẢNG THEO DÕI TIẾN ĐỘ TỔNG THỂ (SPRINT EXECUTION MATRIX)

Bảng tổng hợp giúp người phát triển và AI theo dõi trạng thái thời gian thực trong suốt chu kỳ dự án:

| Sprint | Tên Sprint | Số Lượng Tasks | Khối Lượng Dự Kiến | Trạng Thái | Ngày Hoàn Thành Thực Tế |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **SP 01** | Monorepo Foundation, Shared Types & Tooling | 4 | 1.7 ngày | 🟢 **ĐÃ HOÀN THÀNH** | 12/09/2026 |
| **SP 02** | Docker Infrastructure, PostgreSQL Schema & Redis | 5 | 2.0 ngày | 🟢 **ĐÃ HOÀN THÀNH** | 12/09/2026 |
| **SP 03** | Audio Processor: Pacing & Silence Engine | 5 | 2.0 ngày | 🟢 **ĐÃ HOÀN THÀNH** | 12/09/2026 |
| **SP 04** | Audio Processor: FFmpeg Mastering & Subtitles | 5 | 2.9 ngày | 🟢 **ĐÃ HOÀN THÀNH** | 12/09/2026 |
| **SP 05** | Speech Synthesis Worker (Edge-TTS & MD5 Cache) | 5 | 2.6 ngày | ⚪ Chờ thực hiện | -- |
| **SP 06** | Script-LLM Worker (Ollama Qwen 2.5 NLP) | 5 | 2.6 ngày | ⚪ Chờ thực hiện | -- |
| **SP 07** | Golang Core API Gateway & Database Layer | 5 | 2.6 ngày | ⚪ Chờ thực hiện | -- |
| **SP 08** | Pipeline Orchestration & Realtime WebSockets | 5 | 2.9 ngày | ⚪ Chờ thực hiện | -- |
| **SP 09** | High-Performance Audio Streaming (HTTP 206) | 4 | 1.6 ngày | ⚪ Chờ thực hiện | -- |
| **SP 10** | Next.js 15 Web Studio & Script Editor | 5 | 2.7 ngày | ⚪ Chờ thực hiện | -- |
| **SP 11** | Interactive Karaoke Player & Waveform Audio | 5 | 2.6 ngày | ⚪ Chờ thực hiện | -- |
| **SP 12** | React Native Mobile App & 1-Click Launch | 5 | 3.7 ngày | ⚪ Chờ thực hiện | -- |
| **TỔNG** | **Toàn bộ 12 Sprints Dự Án** | **58 Tasks** | **~29.9 ngày** | **4/12 Hoàn thành (33.3%)** | -- |

---

## 4. CHIẾN LƯỢC QUẢN TRỊ RỦI RO KỸ THUẬT (TECHNICAL RISK MITIGATION)

| Rủi Ro Kỹ Thuật | Mức Độ | Ảnh Hưởng Tiềm Ẩn | Giải Pháp Giảm Thiểu Chủ Động |
| :--- | :---: | :--- | :--- |
| **Lệch mốc thời gian phụ đề (Subtitle Drift)** | **Cao** | Phụ đề SRT bị lệch dần về cuối bài 10 phút, làm hỏng trải nghiệm Karaoke. | Đo đạc thời lượng thực tế của từng clip âm thanh sau khi render thay vì ước tính bằng số từ; Ghi log timestamp mili-giây ở từng câu. *(Đã giải quyết tại SP04-02)* |
| **Edge-TTS bị Rate Limit hoặc gián đoạn** | **Trung bình** | Quá trình tạo giọng đọc 1.500 từ bị treo hoặc fail giữa chừng. | Triển khai cơ chế Retry với Exponential Backoff; Chia batch nhỏ 10 câu/lần; Tích hợp MD5 Smart Cache để không bao giờ gọi lại câu đã có. |
| **Bộ nhớ Container FFmpeg tăng cao** | **Trung bình** | Container `audio-processor` bị OOM (Out Of Memory) khi ghép nối file 10 phút. | Sử dụng cơ chế file tạm streaming của FFmpeg; Cắt ghép theo danh sách demuxer (`concat demuxer`) thay vì nạp toàn bộ audio vào RAM. |
| **Độ trễ tua Audio trên Thiết Bị Di Động** | **Thấp** | Mobile bị giật khựng khi người học bấm lặp câu liên tục. | Áp dụng chuẩn HTTP Range Requests (`206 Partial Content`); Tải trước 30 giây audio vào bộ đệm của native player. |
| **Đồng bộ kiểu dữ liệu giữa Go, Python và TypeScript** | **Trung bình** | Lỗi runtime do khác biệt tên trường JSON (camelCase vs snake_case). | Gói `packages/shared-types` là nguồn chân lý duy nhất (Single Source of Truth); Viết unit tests kiểm tra tính tương thích schema JSON. |

---

## 5. HƯỚNG DẪN KÍCH HOẠT SPRINT TIẾP THEO (NEXT SPRINT ACTIVATION)

Để bắt đầu thực hiện ngay **Sprint 5: Speech Synthesis Worker (Edge-TTS & Smart Caching)**, hãy thực hiện lệnh kiểm tra môi trường:

```bash
# 1. Kiểm tra toàn bộ test suite âm thanh đã hoàn tất
make test-audio
make test-audio-docker

# 2. Khởi tạo và kiểm tra cấu trúc tts-engine
ls -la services/tts-engine

# 3. Kiểm tra Redis broker sẵn sàng làm hàng đợi cho TTS
docker compose up -d redis-broker
docker exec -it meowshadow_redis redis-cli ping
```

