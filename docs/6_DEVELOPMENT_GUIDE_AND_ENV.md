# QUY CHUẨN PHÁT TRIỂN, BIẾN MÔI TRƯỜNG & QUẢN TRỊ RỦI RO
## DỰ ÁN: MEOWSHADOW LAB (MSL-DEV)
### TIÊU CHUẨN CODING CONVENTIONS, MA TRẬN CẤU HÌNH, PHẦN CỨNG & KẾ HOẠCH PHÒNG NGỪA RỦI RO

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `docs/6_DEVELOPMENT_GUIDE_AND_ENV.md` |
| **Phiên bản** | 3.1.0 |
| **Trọng tâm** | Chuẩn hóa phát triển, Vận hành môi trường, Phòng ngừa rủi ro & Tiêu chí nghiệm thu QA |
| **Tài liệu liên quan** | [2_ARCHITECTURE_TECHSTACK.md](./2_ARCHITECTURE_TECHSTACK.md), [5_SPRINT_PLAN.md](./5_SPRINT_PLAN.md) |

---

## 1. QUY CHUẨN QUẢN TRỊ MÃ NGUỒN & GIT WORKFLOW

Dự án áp dụng mô hình **Trunk-based Development có bảo vệ** (Protected Main with Short-lived Feature Branches):

```mermaid
gitGraph
   commit id: "Initial Specs"
   branch feature/audio-processor
   checkout feature/audio-processor
   commit id: "feat(audio): add pacing silence"
   commit id: "feat(audio): add EBU R128 normalize"
   checkout main
   merge feature/audio-processor id: "PR #1 (Squash & Merge)"
   branch feature/script-llm
   checkout feature/script-llm
   commit id: "feat(llm): integrate qwen 2.5"
   checkout main
   merge feature/script-llm id: "PR #2 (Squash & Merge)"
```

### 1.1. Quy tắc Đặt Tên Nhánh (Branch Naming Convention)
* **Tính năng mới:** `feat/<tên-ngắn-gọn>` (Ví dụ: `feat/audio-processor`, `feat/web-karaoke-player`).
* **Sửa lỗi:** `fix/<mô-tả-lỗi>` (Ví dụ: `fix/srt-timestamp-drift`, `fix/edge-tts-timeout`).
* **Tài liệu:** `docs/<nội-dung>` (Ví dụ: `docs/api-schemas-update`).
* **Tối ưu hóa:** `refactor/<tên-module>` (Ví dụ: `refactor/go-gateway-router`).

### 1.2. Quy Chuẩn Commit (Conventional Commits v1.0.0)
Mọi commit bắt buộc tuân theo định dạng: `<type>(<scope>): <mô tả ngắn>`:
* **`feat`**: Thêm tính năng mới (Ví dụ: `feat(tts): add md5 audio clip caching`).
* **`fix`**: Sửa lỗi mã nguồn (Ví dụ: `fix(gateway): resolve pgx connection pool leak`).
* **`docs`**: Thay đổi hoặc bổ sung tài liệu (Ví dụ: `docs(api): add auth and lessons endpoints`).
* **`refactor`**: Cấu trúc lại code mà không thay đổi tính năng hay sửa lỗi.
* **`test`**: Bổ sung hoặc chỉnh sửa unit test, integration test.
* **`chore`**: Cập nhật dependency, cấu hình Docker, Makefile.

---

## 2. QUY CHUẨN LẬP TRÌNH & LINTING THEO TỪNG NGÔN NGỮ

### 2.1. Ngôn Ngữ Golang (Dành cho `services/gateway-core`)
* **Trình định dạng & Linter:** Sử dụng chuẩn chính thức `gofmt` và `golangci-lint` (các linter bắt buộc: `govet`, `errcheck`, `staticcheck`, `unused`).
* **Xử lý Lỗi (Error Handling):** Tuyệt đối không nuốt lỗi (`_ = err`), luôn bọc ngữ cảnh bằng `fmt.Errorf("action failed: %w", err)`.
* **Quản lý Concurrency:** Luôn truyền `context.Context` xuyên suốt từ HTTP request đến database queries và Redis operations để tránh goroutine leak khi client ngắt kết nối.
* **Connection Pool:** Bắt buộc tái sử dụng `*pgxpool.Pool` và `*redis.Client` dưới dạng Singleton Dependency Injection, không tạo mới kết nối trên từng request.

### 2.2. Ngôn Ngữ Python (Dành cho các Microservices AI & Audio)
* **Code Style & Linter:** Sử dụng **`ruff`** (tốc độ siêu nhanh thay thế Flake8/isort) kết hợp **`black`** với độ dài dòng tối đa 100 ký tự.
* **Type Hinting:** Bắt buộc 100% khai báo kiểu dữ liệu (Python 3.10+ typing) và dùng **Pydantic v2** cho Request/Response DTOs.
* **Xử lý Bất đồng bộ:** Sử dụng `asyncio` chuẩn của FastAPI; các tác vụ CPU-bound nặng (như FFmpeg stitching) phải được đẩy vào `run_in_executor` hoặc background task worker để không block Event Loop của FastAPI.

### 2.3. Ngôn Ngữ TypeScript (Dành cho `apps/web`, `apps/mobile`, `packages/*`)
* **Strict Mode:** Bật `strict: true` trong `tsconfig.json`. Nghiêm cấm dùng kiểu `any` (thay thế bằng `unknown` hoặc generic types có kiểm tra runtime).
* **Quản lý State:** Sử dụng `zustand` cho Web Studio để quản lý kịch bản và waveform; không dùng `Redux` cồng kềnh.
* **Chia Sẻ Kiểu:** Mọi kiểu dữ liệu dùng chung bắt buộc import từ `@meowshadow/types`.

---

## 3. CHIẾN LƯỢC QUẢN LÝ MONOREPO

* **Node.js/TypeScript:** Sử dụng **`pnpm workspaces`** để liên kết các packages nội bộ (`@meowshadow/types`, `@meowshadow/api-client`) với `apps/web` và `apps/mobile`.
* **Golang:** Mỗi service Go (`services/gateway-core`) sở hữu `go.mod` độc lập, biên dịch Multi-stage ra image Docker tĩnh (~20MB).
* **Python:** Mỗi worker sở hữu `pyproject.toml` hoặc `requirements.txt` độc lập, khóa cứng phiên bản dependencies (pinned dependencies) để đảm bảo tính tái lập (reproducibility) trên Docker.

---

## 4. MA TRẬN CẤU HÌNH BIẾN MÔI TRƯỜNG (.ENV MATRIX)

Bảng giải thích mục đích và giá trị khuyến nghị của các biến môi trường trong file `.env.example`:

| Tên Biến Môi Trường | Giá Trị Mặc Định | Bắt Buộc | Dịch Vụ Sử Dụng | Mục Đích & Lưu Ý |
| :--- | :--- | :---: | :--- | :--- |
| `ENVIRONMENT` | `development` | Có | Toàn hệ thống | `development` hoặc `production`. |
| `DATABASE_URL` | `postgres://meowuser:...@postgres-db:5432/...` | Có | `gateway-core` | Chuỗi kết nối PostgreSQL 16 qua TCP nội bộ Docker. |
| `REDIS_ADDR` | `redis-broker:6379` | Có | Gateway, All Workers | Địa chỉ Redis Broker cho Task Queue và Pub/Sub. |
| `GATEWAY_PORT` | `8000` | Có | `gateway-core` | Cổng HTTP Gateway công khai ra máy chủ Host. |
| `JWT_SECRET` | `meowshadow_super_secret...` | Có | `gateway-core` | Khóa bí mật ký JWT Token (Tối thiểu 32 ký tự ngẫu nhiên khi lên Production). |
| `STORAGE_DIR` | `/app/storage` | Có | Gateway, Audio/TTS | Thư mục gắn Docker Volume lưu Audio MP3 và file SRT. |
| `OLLAMA_HOST` | `http://host.docker.internal:11434` | Tùy chọn | `script-llm` | Địa chỉ Ollama Local LLM trên máy host. |
| `LLM_MODEL` | `qwen2.5:14b` | Có | `script-llm` | Tên model Ollama thực hiện dịch thuật và phân đoạn. |
| `DEFAULT_TTS_ENGINE` | `edge-tts` | Có | `tts-engine` | Engine TTS mặc định (`edge-tts` hoặc `kokoro`). |
| `DEFAULT_TARGET_LUFS`| `-16.0` | Có | `audio-processor`| Chuẩn âm lượng phát thanh Podcast EBU R128. |
| `NEXT_PUBLIC_API_URL`| `http://localhost:8000` | Có | `apps/web` | URL gọi REST API từ trình duyệt người dùng. |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000` | Có | `apps/web` | URL kết nối WebSocket tiến trình render. |

---

## 5. YÊU CẦU CẤU HÌNH PHẦN CỨNG (SYSTEM & HARDWARE REQUIREMENTS)

Hệ thống được thiết kế theo 2 chế độ vận hành tùy theo tài nguyên máy tính của người dùng:

```mermaid
graph LR
    A[Nhu Cầu Triển Khai] --> B{Có Card Đồ Họa / GPU?}
    B -->|Không có GPU / RAM 8GB-16GB| C[Chế Độ Standard Cloud-Hybrid]
    B -->|GPU Apple Silicon M-series / Nvidia RTX 12GB+| D[Chế Độ 100% Local AI Offline]
    
    C --> C1[Edge-TTS Miễn Phí Tốc Độ Cao\nOllama Qwen 2.5 7B Q4 hoặc Cloud API]
    D --> D1[Fish-Speech / Kokoro TTS\nOllama Qwen 2.5 14B Q8 Metal MPS/CUDA]
```

### 5.1. Chế Độ 1: Standard Cloud-Hybrid (Khuyến nghị cho mọi máy tính)
* **Cấu hình tối thiểu:** CPU 4 Cores, 8GB RAM, 10GB dung lượng ổ đĩa trống.
* **Cách thức:** Sử dụng `edge-tts` (kết nối máy chủ Microsoft Neural TTS tốc độ siêu cao) và Ollama chạy model nhẹ `qwen2.5:7b-instruct-q4_K_M`.
* **Hiệu năng:** Tạo file audio 10 phút (~1.500 từ) chỉ mất **15 – 25 giây**.

### 5.2. Chế Độ 2: 100% Local AI Offline (Dành cho máy trạm / GPU rời)
* **Cấu hình tối ưu:**
  * **macOS:** Apple Silicon (M1/M2/M3/M4 Pro/Max) với tối thiểu **16GB Unified Memory** (tận dụng PyTorch Metal MPS).
  * **Windows / Linux:** NVIDIA GPU với tối thiểu **12GB VRAM** (RTX 3060, 4060, 4070 trở lên, hỗ trợ CUDA 12).
* **Cách thức:** Tự động nạp model TTS cục bộ (`Fish-Speech 1.5`, `F5-TTS` hoặc `Kokoro-82M`) và `qwen2.5:14b`.
* **Ưu điểm:** Hoạt động không cần kết nối Internet, bảo mật tuyệt đối dữ liệu cá nhân.

---

## 6. MA TRẬN QUẢN TRỊ RỦI RO & PHƯƠNG ÁN DỰ PHÒNG (RISK MATRIX)

| Mã Rủi Ro | Rủi Ro Kỹ Thuật | Mức Độ | Tác Động | Giải Pháp Dự Phòng & Khắc Phục (Mitigation) |
| :---: | :--- | :---: | :---: | :--- |
| **RSK-01** | **`edge-tts` bị Rate-limit hoặc chặn IP** | Cao | Trung bình | 1. Tích hợp cơ chế tự động xoay vòng User-Agent và exponential backoff.<br>2. Xây dựng **Fallback Engine**: Tự động chuyển hướng sang Kokoro-82M (chạy cục bộ CPU siêu nhẹ) nếu `edge-tts` trả về mã lỗi 429 hoặc timeout. |
| **RSK-02** | **Tràn Bộ Nhớ Khi Ghép Nối Audio 10 Phút** | Trung bình | Cao | Sử dụng kỹ thuật xử lý audio dạng Stream hoặc chia nhỏ file temp theo từng chunk trên đĩa thay vì nạp toàn bộ mảng dữ liệu 10 phút âm thanh không nén vào RAM của container. |
| **RSK-03** | **Lệch mốc thời gian phụ đề Karaoke (Subtitle Drift)** | Cao | Cao | Tuyệt đối **không dùng công thức ước tính lý thuyết** `(độ dài text * hệ số)`. Đo đạc chính xác thời lượng thực tế của từng file audio clip MP3 sau khi render qua thư viện `mutagen` / `ffprobe` trước khi tính toán timestamp cho file `.srt`. |
| **RSK-04** | **Phình to ổ đĩa lưu trữ (Storage Saturation)** | Trung bình | Thấp | 1. Thiết lập Cronjob chạy định kỳ dọn dẹp các audio clips tạm (`/app/storage/cache`) sau 48 giờ.<br>2. Băm mã MD5 nội dung câu để tái sử dụng file clip có sẵn, tránh tạo trùng lặp file. |

---

## 7. TIÊU CHUẨN NGHIỆM THU CHẤT LƯỢNG (QA & ACCEPTANCE CRITERIA)

Mỗi tính năng trước khi được coi là hoàn thành (Definition of Done - DoD) phải vượt qua các tiêu chuẩn kỹ thuật sau:

1. **Chuẩn hóa Âm Lượng:** File audio đầu ra đo bằng `ffmpeg-normalize` hoặc bộ lọc `ebur128` phải đạt chuẩn tích hợp Integrated Loudness **-16.0 LUFS (sai số tối đa ± 0.5 LUFS)**, True Peak không vượt quá **-1.0 dBFS**.
2. **Độ Chính Xác Của Phụ Đề Karaoke:** Mốc bắt đầu và kết thúc của từng câu phụ đề trong file `.srt` / `.vtt` phải khớp với giọng đọc với độ trễ **dưới 50ms**, không xảy ra hiện tượng chữ sáng trước khi tiếng phát ra hoặc ngược lại.
3. **Định Mức Khoảng Lặng (Pacing Accuracy):**
   * Sau câu tiếng Việt: `1.5s ± 0.05s`.
   * Sau câu tiếng Anh / Nhật: `3.5s ± 0.05s`.
   * Giữa các câu trong cùng một đoạn: `0.5s ± 0.05s`.
4. **Tốc Độ Xử Lý (Throughput):** Bài viết 1.500 từ (~65 cặp câu) khi render qua Edge-TTS song song phải hoàn tất và sẵn sàng phát dưới **25 giây**.
5. **Độ Trễ Bắt Đầu Phát (First Play Latency):** Nhờ cơ chế `206 Partial Content`, trình phát trên Web Studio hoặc Mobile phải phát ra âm thanh trong vòng **100ms** kể từ khi người dùng bấm Play, không cần tải trọn vẹn cả file 15MB.
