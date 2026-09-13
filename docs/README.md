# 📚 MEOWSHADOW LAB - HỆ THỐNG TÀI LIỆU DỰ ÁN
### TRUNG TÂM QUẢN TRỊ TÀI LIỆU KỸ THUẬT, KIẾN TRÚC & LỘ TRÌNH PHÁT TRIỂN

---

Chào mừng bạn đến với trung tâm tài liệu kỹ thuật của dự án **MeowShadow Lab** — Nền tảng luyện nghe và nhại giọng đa ngữ (**Việt - Anh - Nhật**) chuẩn Podcast & Shadowing, hoạt động trên **Web, iOS và Android** với kiến trúc **Polyglot Microservices (Golang + Python)** và khả năng **chạy 100% trên Docker**.

---

## 🗂️ Danh Mục Tài Liệu Kỹ Thuật Dự Án (Tầng 1: Quy Hoạch Hệ Thống)

| Tài liệu | Tên văn bản | Nội dung chính |
| :---: | :--- | :--- |
| **[`1_SRS.md`](./1_SRS.md)** | **Bản Đặc Tả Yêu Cầu Phần Mềm (SRS)** | Yêu cầu nghiệp vụ, luồng người dùng (User Journey), tính năng Web & Mobile, định mức âm thanh & nhịp điệu Pacing (1.5s VI, 3.5s EN/JA). |
| **[`2_ARCHITECTURE_TECHSTACK.md`](./2_ARCHITECTURE_TECHSTACK.md)** | **Kiến Trúc Hệ Thống & Database** | Sơ đồ Microservices (Go Gateway + Python Workers), Cơ sở dữ liệu (**PostgreSQL 16 + pgx Connection Pool + JSONB** + **Redis 7** + **Expo SQLite**). |
| **[`3_DOCKER_CONTAINERIZATION.md`](./3_DOCKER_CONTAINERIZATION.md)** | **Triển Khai 100% Docker-First** | Đặc tả `docker-compose.yml`, multi-stage Dockerfiles, cấu hình Network, Volume chia sẻ, và cấu hình chạy ngầm. |
| **[`4_API_AND_DATA_SCHEMAS.md`](./4_API_AND_DATA_SCHEMAS.md)** | **Giao Kèo API & Kiểu Dữ Liệu** | Chuẩn RESTful API (Auth, Lessons, Progress), HTTP 206 Streaming, WebSocket Realtime, Error responses chuẩn hóa, và gói kiểu TypeScript `@meowshadow/types`. |
| **[`5_SPRINT_PLAN.md`](./5_SPRINT_PLAN.md)** | **Kế Hoạch Triển Khai 12 Sprint** | Lộ trình chi tiết 12 Sprint qua 5 giai đoạn: Docker nền tảng, Audio Processor, AI Workers, Go Gateway, Next.js Web đến React Native Mobile App. |

| **[`6_DEVELOPMENT_GUIDE_AND_ENV.md`](./6_DEVELOPMENT_GUIDE_AND_ENV.md)** | **Quy Chuẩn Code, Env & Rủi Ro** | Git Workflow, Conventional Commits, Coding Conventions (Go, Python, TypeScript), Ma trận `.env`, Yêu cầu phần cứng và Quản trị rủi ro. |
| **[`adr/`](./adr/)** | **Hồ Sơ Quyết Định Kiến Trúc (ADR)** | Bộ văn bản quyết định kỹ thuật then chốt: Fiber v2, Zero-Copy Streaming, Redis Orchestration, Dual Subtitles, Storage Retention, Embedded Swagger. |

---

## 🧭 Cẩm Nang Kỹ Thuật Chi Tiết Từng Phân Hệ (Tầng 2: Localized Service Runbooks)

Dự án áp dụng mô hình phân tầng tài liệu chuẩn Enterprise: Mỗi dịch vụ, ứng dụng và thư viện đều sở hữu cẩm nang kỹ thuật chuyên sâu đặt trực tiếp tại thư mục mã nguồn:

| Phân hệ | Vị trí tài liệu | Vai trò & Trọng tâm kỹ thuật | Cổng Dev |
| :--- | :--- | :--- | :---: |
| **Golang Gateway** | **[`services/gateway-core/README.md`](../services/gateway-core/README.md)** | Go Clean Architecture, `pgxpool`, `sqlc`, HTTP 206 Streaming, WebSocket Hub, Swagger UI | `8000` |
| **Script-LLM Worker** | **[`services/script-llm/README.md`](../services/script-llm/README.md)** | FastAPI, Regex Tag Parser (`[VI]`, `[EN]`, `[JA]`), Ollama Qwen 3 8B Driver | `8001` |
| **TTS Engine Worker** | **[`services/tts-engine/README.md`](../services/tts-engine/README.md)** | Multi-TTS Strategy (Edge-TTS, Kokoro, Fish-Speech), MD5 Cache, Async Batch | `8002` |
| **Audio Processor** | **[`services/audio-processor/README.md`](../services/audio-processor/README.md)** | FFmpeg & Pydub, Pacing Silence (1.5s/3.5s), EBU R128 (-16 LUFS), SRT/VTT Engine | `8003` |
| **Web Studio** | **[`apps/web/README.md`](../apps/web/README.md)** | Next.js 15 App Router, Zustand, Interactive Karaoke Player, Waveform | `3000` |
| **Mobile App** | **[`apps/mobile/README.md`](../apps/mobile/README.md)** | React Native / Expo, Background Audio, Lockscreen, SQLite Offline Sync | - |
| **Shared Types** | **[`packages/shared-types/README.md`](../packages/shared-types/README.md)** | Gói kiểu TypeScript `@meowshadow/types`, Single Source of Truth | - |
| **API Client SDK** | **[`packages/api-client/README.md`](../packages/api-client/README.md)** | SDK dùng chung, Auto Refresh JWT Token, Typed API & WebSocket Client | - |
| **Shared Storage** | **[`storage/README.md`](../storage/README.md)** | Cấu trúc phân cấp 5 thư mục con (`audio`, `subtitles`, `cache`, `cues`, `temp`) | - |

---

## 🚦 Trạng Thái Hiện Tại & Các Bước Bắt Đầu

Dự án hiện đã hoàn tất **100% Giai đoạn 1, 2, 3 và Sprint 10 Giai đoạn 4 (Toàn bộ Backend, AI Audio Engine, Gateway Core & Next.js 15 Web Studio: Sprint 1 đến 10 - 10/12 Sprints, 83.3%)** và đang sẵn sàng bước vào **Sprint 11: Interactive Karaoke Player & Waveform Audio Experience**.

### 1. Chuẩn bị file cấu hình môi trường
Trước khi khởi chạy hệ thống, sao chép file cấu hình mẫu ở thư mục gốc:
```bash
# 1. Clone or navigate to project directory
cd MeowShadow_Lab

# 2. Create environment configuration file from template
cp .env.example .env
```

### 2. Khởi chạy toàn bộ hệ sinh thái Backend & Workers
Khởi chạy toàn bộ hạ tầng cơ sở dữ liệu, message broker và các microservices:
```bash
# Start PostgreSQL, Redis, Shared Storage, Gateway-Core, and Python Workers
docker compose up --build -d

# Check container health and status
docker compose ps
```

* 🌐 **Web Studio UI (Sprint 10):** `http://localhost:3000`
* 🚀 **Golang Gateway API & Swagger Docs (Sprint 9):** `http://localhost:8000/swagger`
* 🗄️ **PostgreSQL Server:** `localhost:5432` (DB: `meowshadow_db`)
* ⚡ **Redis Broker:** `localhost:6379`

