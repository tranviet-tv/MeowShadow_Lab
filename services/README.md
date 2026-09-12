# 🛠️ CỤM VI DỊCH VỤ BACKEND & AI WORKERS (SERVICES)

Thư mục `services/` chứa toàn bộ mã nguồn của các vi dịch vụ phía máy chủ (Polyglot Microservices: Golang & Python). Hệ thống được thiết kế theo nguyên tắc Decoupling: **Golang Gateway đóng vai trò nhạc trưởng điều phối duy nhất giao tiếp với PostgreSQL**, trong khi các **Python AI Workers hoạt động độc lập bất đồng bộ qua Redis Streams / Task Queue và Shared Storage**.

---

## 📋 Danh Sách Các Vi Dịch Vụ

| Vi dịch vụ | Ngôn ngữ & Framework | Cổng Docker | Cẩm nang kỹ thuật chi tiết | Vai trò chính |
| :--- | :--- | :---: | :--- | :--- |
| **`gateway-core`** | **Golang 1.22+ (Fiber/Gin)** | `8000` | **[gateway-core/README.md](./gateway-core/README.md)** | API Gateway, Auth, WebSocket Hub, HTTP 206 Streaming, Dispatcher |
| **`script-llm`** | **Python 3.11+ (FastAPI)** | `8001` | **[script-llm/README.md](./script-llm/README.md)** | Regex Parser `[VI]`, `[EN]`, `[JA]`, Phân đoạn 3-4 câu, Ollama Qwen 2.5 |
| **`tts-engine`** | **Python 3.11+ (FastAPI)** | `8002` | **[tts-engine/README.md](./tts-engine/README.md)** | Multi-engine (Edge-TTS, Kokoro, Fish-Speech), Smart Cache MD5 |
| **`audio-processor`**| **Python 3.11+ (FFmpeg/Pydub)** | `8003` | **[audio-processor/README.md](./audio-processor/README.md)** | Pacing Silence (1.5s/3.5s), Mastering EBU R128 (-16 LUFS), Sinh SRT/VTT |

---

## 🔄 Luồng Tương Tác Giữa Các Vi Dịch Vụ (Workflow)

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web / Mobile
    participant GW as gateway-core (Go)
    participant Redis as Redis Broker
    participant LLM as script-llm (Python)
    participant TTS as tts-engine (Python)
    participant Audio as audio-processor (Python)
    participant Storage as Shared Storage Volume
    participant DB as PostgreSQL 16

    Client->>GW: POST /api/v1/audio/generate (Kịch bản thô & Cấu hình Pacing)
    GW->>Redis: Dispatch Job: PARSE_AND_TRANSLATE
    GW-->>Client: 202 Accepted (task_id)

    Redis->>LLM: Consume Job
    LLM->>LLM: Regex bóc tách [VI], [EN], [JA] & Dịch câu
    LLM-->>Redis: Trả về danh sách Structured Chunks

    Redis->>TTS: Consume Job: BATCH_SYNTHESIS
    TTS->>TTS: Kiểm tra MD5 Cache -> Gọi TTS Engine song song
    TTS-->>Redis: Trả về danh sách Audio Clip Paths

    Redis->>Audio: Consume Job: AUDIO_MASTERING
    Audio->>Storage: Đọc Clips -> Chèn Lặng (1.5s/3.5s) -> EBU R128 (-16 LUFS)
    Audio->>Storage: Ghi file final_lesson.mp3 & lesson.srt
    Audio-->>Redis: Báo hoàn tất kèm Duration & Metadata

    Redis->>GW: Event: TASK_COMPLETED
    GW->>DB: Lưu Lesson Record (JSONB chunks, srt_path, audio_path)
    GW->>Client: Push WebSocket Event: COMPLETED (result_lesson_id)
```

---

## 🚀 Hướng Dẫn Khởi Chạy Nhanh

1. **Khởi chạy toàn bộ bằng Docker:**
   ```bash
   # At repository root:
   docker compose up -d
   ```
2. **Khởi chạy riêng lẻ từng service:**
   Vui lòng truy cập vào `README.md` của từng service tương ứng để xem hướng dẫn chi tiết về cấu hình biến môi trường (`.env`), cài đặt dependencies và lệnh debug độc lập.
