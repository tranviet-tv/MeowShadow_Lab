# 🐱 MEOWSHADOW LAB
### NỀN TẢNG LUYỆN NGHE & NHẠI GIỌNG ĐA NGỮ CHUẨN PODCAST (VIỆT - ANH - NHẬT)
#### KIẾN TRÚC POLYGLOT MICROSERVICES (GOLANG + PYTHON) • 100% DOCKER-FIRST • WEB & MOBILE

---

<p align="center">
  <img src="assets/logo/logo_preview_dark.png" alt="MeowShadow Lab Logo" width="320" style="border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.3);" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Architecture-Polyglot_Microservices-blueviolet?style=for-the-badge&logo=codeigniter" alt="Architecture" />
  <img src="https://img.shields.io/badge/Backend-Golang_Fiber_%2B_Python_FastAPI-00ADD8?style=for-the-badge&logo=go" alt="Backend" />
  <img src="https://img.shields.io/badge/Frontend-Next.js_15_(TypeScript)-black?style=for-the-badge&logo=next.js" alt="Frontend" />
  <img src="https://img.shields.io/badge/Mobile-React_Native_%2F_Expo-4630EB?style=for-the-badge&logo=expo" alt="Mobile" />
  <img src="https://img.shields.io/badge/Deployment-100%25_Docker--First-2496ED?style=for-the-badge&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL_16_%2B_Redis_7-336791?style=for-the-badge&logo=postgresql" alt="Database" />
</p>

---

## 📖 GIỚI THIỆU DỰ ÁN (PROJECT OVERVIEW)

**MeowShadow Lab** là hệ thống luyện nghe và phản xạ nhại giọng đa ngữ (**Việt - Anh - Nhật**) thông minh, được thiết kế để giải quyết bài toán cốt lõi của người học ngoại ngữ: **Nghe hiểu thụ động (Passive Listening) kết hợp nhại giọng chủ động (Shadowing) theo chuẩn âm thanh Podcast chuyên nghiệp.**

Hệ thống cho phép người dùng đưa vào văn bản thô 1.300 – 1.500 từ, sử dụng AI (Qwen 3 8B) tự động phân đoạn và dịch thuật, sau đó ghép nối âm thanh với quy tắc khoảng lặng thông minh (**Smart Silence Pacing**):
* **`0.5s`** giữa các câu trong cùng khối.
* **`1.5s`** sau khối Tiếng Việt (chuyển đổi ngữ cảnh tư duy).
* **`3.5s`** sau khối Ngoại ngữ (thời gian vàng để người học nhại lại câu - Shadowing).
* Chuẩn hóa âm lượng tự động theo tiêu chuẩn phát thanh truyền hình **EBU R128 (-16 LUFS)**.
* Đồng bộ âm thanh và phụ đề Karaoke từng câu với độ trễ siêu thấp qua **HTTP Range Audio Streaming (206 Partial Content)**.

---

## 📂 TRUNG TÂM TÀI LIỆU KỸ THUẬT (DOCUMENTATION HUB)

Toàn bộ tài liệu phân tích, kiến trúc, thiết kế API và lộ trình dự án được quy hoạch bài bản trong thư mục [`docs/`](./docs):

| Tài liệu | Văn bản kỹ thuật | Nội dung tóm tắt |
| :--- | :--- | :--- |
| **[`1_SRS.md`](./docs/1_SRS.md)** | Đặc tả yêu cầu phần mềm (SRS) | Nghiệp vụ Pacing (0.5s - 1.5s - 3.5s), chuẩn EBU R128 (-16 LUFS), bảng giọng đọc Edge-TTS, tính năng Web & Mobile. |
| **[`2_ARCHITECTURE_TECHSTACK.md`](./docs/2_ARCHITECTURE_TECHSTACK.md)** | Kiến trúc hệ thống & Database | Sơ đồ Polyglot Microservices, Go Fiber API Gateway, Python AI Workers, Schema PostgreSQL 16 (JSONB & GIN Index), Redis 7. |
| **[`3_DOCKER_CONTAINERIZATION.md`](./docs/3_DOCKER_CONTAINERIZATION.md)** | Hạ tầng 100% Docker-First | Cấu hình `docker-compose.yml`, multi-stage builds, mạng nội bộ `meowshadow-network` và volume lưu trữ audio. |
| **[`4_API_AND_DATA_SCHEMAS.md`](./docs/4_API_AND_DATA_SCHEMAS.md)** | Hợp đồng API & Kiểu dữ liệu | RESTful APIs (Auth, Lessons, Progress, Audio 206 Streaming), WebSocket Realtime, Error responses và TypeScript Interfaces `@meowshadow/types`. |
| **[`5_SPRINT_PLAN.md`](./docs/5_SPRINT_PLAN.md)** | Kế hoạch lộ trình 12 Sprint | Lộ trình chi tiết 12 Sprint qua 5 giai đoạn từ Hạ tầng Docker & Audio Worker đến Go Gateway, Web Studio và Mobile App. |
| **[`6_DEVELOPMENT_GUIDE_AND_ENV.md`](./docs/6_DEVELOPMENT_GUIDE_AND_ENV.md)** | Quy chuẩn code, Env & Rủi ro | Quy tắc Git, Conventional Commits, Code conventions, bảng biến môi trường `.env`, cấu hình phần cứng và quản trị rủi ro. |
| **[`adr/`](./docs/adr/)** | Hồ sơ Quyết định Kiến trúc (ADR) | Bộ văn bản quyết định kỹ thuật: Fiber v2, Zero-Copy Streaming, Redis Orchestration, Dual Subtitles, Storage Retention, Embedded Swagger. |
| **[`assets/logo/README.md`](./assets/logo/README.md)** | Tài nguyên Thương hiệu & Logo | Bộ nhận diện vector SVG, PNG 1024px, Dark/Light Mode, Favicon và mẫu Next.js Brand Component. |


---

## 🏗️ CẤU TRÚC MONOREPO TOÀN DỰ ÁN

```text
MeowShadow_Lab/
├── README.md                       # Trang chủ dự án & Giới thiệu tổng quan
├── .env.example                    # Mẫu cấu hình tất cả biến môi trường
├── docker-compose.yml              # Điều phối toàn bộ các container (Sprint 1)
├── docs/                           # Bộ tài liệu kỹ thuật dự án (SRS, Arch, API, Sprint...)
│   ├── README.md
│   ├── 1_SRS.md
│   ├── 2_ARCHITECTURE_TECHSTACK.md
│   ├── 3_DOCKER_CONTAINERIZATION.md
│   ├── 4_API_AND_DATA_SCHEMAS.md
│   ├── 5_SPRINT_PLAN.md
│   ├── 6_DEVELOPMENT_GUIDE_AND_ENV.md
│   └── adr/                        # Architecture Decision Records (ADR-0001 -> ADR-0005)
├── assets/                         # Bộ nhận diện thương hiệu, icons, logo preview
│   └── logo/
├── apps/                           # Ứng dụng phía người dùng (Frontend & Mobile)
│   ├── web/                        # Next.js 15 (TypeScript, Tailwind CSS, Lucide Icons)
│   └── mobile/                     # React Native / Expo (iOS & Android)
├── packages/                       # Thư viện dùng chung Monorepo
│   ├── shared-types/               # TypeScript Definitions (@meowshadow/types)
│   └── api-client/                 # SDK API Client dùng chung cho Web & Mobile
├── services/                       # Hệ thống Backend & AI Microservices
│   ├── gateway-core/               # Golang Fiber Core API Gateway, Auth & Audio Streaming
│   ├── script-llm/                 # Python FastAPI + Ollama Qwen 3 8B Dịch thuật & Phân đoạn
│   ├── tts-engine/                 # Python FastAPI + Edge-TTS & Local AI TTS Engine
│   └── audio-processor/            # Python FastAPI + FFmpeg chèn Pacing & EBU R128
└── storage/                        # Shared Docker Volume chứa Audio MP3, SRT & Clip Cache
```

---

## 🚦 TRẠNG THÁI HIỆN TẠI & LỘ TRÌNH TRIỂN KHAI (12 SPRINT / 5 GIAI ĐOẠN)

| Giai đoạn / Mã Sprint | Tên Phân Hệ & Mục Tiêu | Trọng Tâm Kỹ Thuật | Trạng Thái |
| :--- | :--- | :--- | :---: |
| **Giai đoạn 1: Nền Tảng & Audio Core** | | | |
| **Sprint 1** | Monorepo Foundation & Tooling | Turborepo, `pnpm`, `@meowshadow/types`, `@meowshadow/api-client`. | 🟢 **Hoàn thành** |
| **Sprint 2** | Docker Infrastructure & DB Schema | `docker-compose.yml`, PostgreSQL 16 + pgvector, Goose migrations, Redis 7. | 🟢 **Hoàn thành** |
| **Sprint 3** | Audio Pacing & Silence Engine | Python FastAPI, `silence_generator.py` (1.5s VI / 3.5s EN/JA), timeline continuity. | 🟢 **Hoàn thành** |
| **Sprint 4** | FFmpeg Mastering & Subtitles | Nối clips, chuẩn hóa EBU R128 (-16 LUFS), sinh phụ đề SRT & WebVTT chuẩn xác. | 🟢 **Hoàn thành** |
| **Giai đoạn 2: AI & Tổng Hợp Giọng Nói** | | | |
| **Sprint 5** | Speech Synthesis Worker | Edge-TTS song song (`asyncio.gather`), Smart Cache MD5, Redis task consumer. | 🟢 **Hoàn thành** |
| **Sprint 6** | Script-LLM Worker | Regex tag tokenizer `[VI]`, `[EN]`, `[JA]`, Ollama Qwen 3 8B Auto-chunking & Translate. | 🟢 **Hoàn thành** |
| **Giai đoạn 3: Gateway Core & Streaming** | | | |
| **Sprint 7** | Golang Core API Gateway | Go Fiber v2, `pgxpool` + `sqlc`, JWT Auth, Guest mode, RESTful Lesson CRUD. | 🟢 **Hoàn thành** |
| **Sprint 8** | Pipeline Orchestration & WebSockets | State Machine, Redis Stream & PubSub, WebSocket Hub Realtime, Push Dispatcher. | 🟢 **Hoàn thành** |
| **Sprint 9** | High-Performance Audio Streaming | HTTP 206 Range Streaming (seek < 100ms), Static Asset Server, Storage Retention, Swagger UI. | 🟢 **Hoàn thành** |
| **Giai đoạn 4: Web Studio Trực Quan** | | | |
| **Sprint 10** | Next.js 15 Web & Script Editor | Next.js 15 App Router, Bilingual Script Editor, Pacing Studio, Dark/Light Mode. | 🟢 **Hoàn thành** |
| **Sprint 11** | Interactive Karaoke & Waveform | Karaoke Player sync phụ đề, Waveform visualizer, Hotkeys `Space`/`J`/`L`/`R`, Export hub. | 🟢 **Hoàn thành** |
| **Giai đoạn 5: Mobile & Phát Hành 1-Click** | | | |
| **Sprint 12** | React Native Mobile App & Launch | Background Audio, Lockscreen controls, SQLite Offline Sync, Kokoro AI, 1-Click script `run.sh`. | 🟢 **Hoàn thành** |
| **TỔNG KẾT** | **Tiến độ toàn bộ dự án** | **Hoàn tất 12/12 Sprints (100.0%)** | 🟢 **Sẵn Sàng Bàn Giao (v3.2.0)** |

---

## 🚀 HƯỚNG DẪN KHỞI CHẠY HỆ THỐNG (QUICK START & RUN GUIDE)

### 1. Yêu Cầu Môi Trường & Chuẩn Bị (Prerequisites)
* **Docker Desktop** (hoặc OrbStack / Docker Engine v24+) hỗ trợ Docker Compose v2.
* **Node.js** v20+ & **pnpm** v9+ (cho Web Studio và Mobile App).
* **Go** v1.23+ (nếu debug Gateway Core ngoài Docker).
* **Python** v3.11+ & **FFmpeg** (nếu debug Audio Services ngoài Docker).
* **Expo Go** trên thiết bị iOS/Android (nếu chạy kiểm thử ứng dụng di động).

**Bước chuẩn bị:** Tạo file cấu hình môi trường từ mẫu cấu hình:
```bash
cp .env.example .env
```

---

### 2. Cách 1: Khởi Chạy 1-Click Tự Động (100% Docker-First - Khuyên Dùng)

Chỉ cần đúng **1 câu lệnh duy nhất** để tự động kiểm tra môi trường/công cụ, chạy migrations, seed dữ liệu mẫu 1.500 từ, kích hoạt toàn bộ microservices (Go Gateway, TTS Engine, Audio Processor, Script-LLM) và khởi chạy Web Studio:

```bash
# Sử dụng Makefile:
make run

# Hoặc thực thi trực tiếp script:
./scripts/run.sh
```

> **Tự động mở trình duyệt**: Sau khi các service khởi động và kiểm tra sức khỏe thành công, hệ thống sẽ tự động mở Web Studio tại [http://localhost:3000](http://localhost:3000).

#### Các tùy chọn khởi chạy mở rộng:
```bash
# Khởi chạy hệ thống và bật luôn Expo Mobile App Dev Server:
./scripts/run.sh --mobile
# hoặc: make mobile

# Kiểm tra sức khỏe real-time toàn bộ container & endpoints:
./scripts/run.sh --status
# hoặc: make run-status

# Kiểm tra tương thích môi trường và công cụ (Dry-run không khởi động service):
./scripts/run.sh --dry-run
# hoặc: make run-dry

# Dừng và tắt sạch toàn bộ các container:
./scripts/run.sh --down
# hoặc: make down
```

---

### 3. Cách 2: Khởi Chạy Từng Phân Hệ Thủ Công (Dành Cho Developer & Debug)

Dành cho nhà phát triển muốn chạy hạ tầng DB/Redis trên Docker nhưng debug từng service hoặc UI trực tiếp trên máy host:

```bash
# Bước 1: Khởi chạy hạ tầng cơ sở (PostgreSQL 16 + Redis 7)
make up

# Bước 2: Chạy migrations lược đồ cơ sở dữ liệu và nạp dữ liệu mẫu
make db-migrate
make db-seed

# Bước 3: Khởi chạy cụm Microservices backend (Gateway, Audio, TTS, LLM)
docker compose --profile services up -d

# Bước 4: Khởi chạy Web Studio giao diện lập trình viên (Next.js 15)
pnpm --filter @meowshadow/web dev

# Bước 5 (Tùy chọn): Khởi chạy ứng dụng di động (Expo Mobile App)
pnpm --filter @meowshadow/mobile start
```

---

### 4. Danh Mục Cổng Dịch Vụ & Endpoints

| Dịch vụ / Phân hệ | Cổng & Đường dẫn truy cập | Tài khoản / Ghi chú |
| :--- | :--- | :--- |
| 🌐 **Next.js 15 Web Studio** | [http://localhost:3000](http://localhost:3000) | Giao diện Bilingual Script Editor & Karaoke Player |
| 🚀 **Swagger UI & OpenAPI Docs** | [http://localhost:8000/swagger](http://localhost:8000/swagger) | Tài liệu API tương tác Golang Gateway Core |
| 🩺 **Gateway Core API & Health** | [http://localhost:8000/health](http://localhost:8000/health) | RESTful API & WebSocket Realtime Hub |
| 🗄️ **Adminer Database Studio** | [http://localhost:8080](http://localhost:8080) | DB: `meowshadow_db` / User: `meowuser` / Pass: `meowpassword` |
| ⚡ **Redis Cache & Broker** | `localhost:6379` | Quản lý Pub/Sub và Task Queue |
| 🎙️ **TTS Engine (Edge + Kokoro)** | [http://localhost:8002/health](http://localhost:8002/health) | Tổng hợp giọng đọc đa ngữ song song |
| 🎚️ **Audio Processor Service** | [http://localhost:8003/api/v1/health](http://localhost:8003/api/v1/health) | Nhịp dừng Pacing (0.5s - 1.5s - 3.5s) & EBU R128 (-16 LUFS) |
| 🧠 **Script-LLM Worker** | [http://localhost:8001/health](http://localhost:8001/health) | Tự động phân đoạn và dịch thuật (Ollama Qwen 3 8B) |

---

### 5. Quản Trị Cơ Sở Dữ Liệu & Kiểm Thử

```bash
# Xem nhật ký logs theo thời gian thực:
make logs

# Truy cập PostgreSQL CLI trực tiếp:
make psql

# Truy cập Redis CLI:
make redis-cli

# Mở Web Database Studio (Adminer):
make db-studio

# Chạy toàn bộ test suites monorepo (Go, Python Pytest, TypeScript):
make test-all
```


---

## 📜 QUY CHUẨN ĐÓNG GÓP & BẢN QUYỀN

* Dự án áp dụng quy chuẩn **Conventional Commits** (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).
* Chi tiết quy chuẩn lập trình và quản trị rủi ro được lưu trữ tại: **[`docs/6_DEVELOPMENT_GUIDE_AND_ENV.md`](./docs/6_DEVELOPMENT_GUIDE_AND_ENV.md)**.
* **Bản quyền © 2026 MeowShadow Lab.** All rights reserved.
