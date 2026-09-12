# 🎙️ TTS-ENGINE: MULTI-ENGINE SPEECH SYNTHESIS WORKER
## DỰ ÁN: MEOWSHADOW LAB (MSL-TTS)
### TỔNG HỢP GIỌNG NÓI ĐA NỀN TẢNG (EDGE-TTS / KOKORO / FISH-SPEECH), SMART CACHE MD5 & ASYNC BATCHING

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `services/tts-engine/` |
| **Ngôn ngữ & Runtime** | **Python 3.11+** |
| **Framework Web** | **FastAPI** + **Uvicorn** (Asynchronous) |
| **TTS Engines Hỗ Trợ** | **Microsoft Edge-TTS** (Chính), **Kokoro-82M**, **Fish-Speech** |
| **Tăng Tốc Phần Cứng** | **Apple Silicon MPS** (`torch.backends.mps`) / **NVIDIA CUDA** |
| **Cơ Chế Cache** | **Băm MD5 `(text + voice_id + speed)`** lưu trữ tại Shared Storage Volume |
| **Cổng mặc định** | `8002` (Docker Container) |

---

## 1. VAI TRÒ & NGUYÊN LÝ THIẾT KẾ

`tts-engine` là vi dịch vụ xử lý âm thanh chịu tải cao, nhận các đoạn văn bản ngắn và chuyển đổi thành các file âm thanh clip con (`.mp3`):

1. **Mô hình Strategy Pattern (Đa Engine Linh Hoạt):**
   - Hệ thống không bị bó buộc vào 1 nhà cung cấp duy nhất.
   - Giao diện trừu tượng `BaseTTSEngine` định nghĩa 2 phương thức chuẩn: `synthesize(text, voice, speed) -> bytes` và `list_voices() -> List[VoiceMetadata]`.
   - Các Engine cụ thể (`EdgeTTSEngine`, `KokoroEngine`, `FishSpeechEngine`) kế thừa từ interface này. Dễ dàng bổ sung thêm các engine mới (F5-TTS, Piper, OpenAI TTS) trong tương lai.
2. **Smart Caching Engine (Tiết Kiệm 70–80% Thời Gian):**
   - Mỗi câu thoại được băm mã hóa MD5:
     $$\text{hash} = \text{MD5}(\text{clean\_text} + \text{voice\_id} + \text{speed})$$
   - Trước khi gọi engine sinh âm thanh, worker kiểm tra file `/app/storage/cache/{hash}.mp3`. Nếu đã tồn tại, lập tức tái sử dụng mà không cần tốn tài nguyên tổng hợp lại.
3. **Tổng Hợp Song Song Bất Đồng Bộ (Asyncio Batching):**
   - Thay vì sinh âm thanh tuần tự từng câu một (mất 5-10 phút cho một bài 100 câu), worker sử dụng `asyncio.gather()` kết hợp `asyncio.Semaphore(5)` để xử lý đồng thời 5 câu cùng lúc, rút ngắn thời gian xử lý xuống **dưới 60 giây**.
4. **Báo Cáo Tiến Độ Thời Gian Thực:**
   - Cứ mỗi câu hoàn tất, worker phát tín hiệu cập nhật % tiến độ về Redis Pub/Sub để Go Gateway đẩy xuống trình duyệt qua WebSocket.

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ

```text
services/tts-engine/
├── src/
│   ├── main.py                     # Khởi tạo FastAPI App & Lifespan
│   ├── config.py                   # Đọc STORAGE_DIR, REDIS_ADDR, DEFAULT_ENGINE
│   │
│   ├── api/                        # HTTP Endpoints (Xem danh sách giọng, nghe thử)
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── synthesize.py   # POST /api/v1/synthesize: Nghe thử 1 câu tức thì
│   │       │   ├── voices.py       # GET /api/v1/voices: Lấy danh sách giọng Nam/Nữ đa ngữ
│   │       │   └── health.py
│   │       └── router.py
│   │
│   ├── engines/                    # Strategy Pattern cho các bộ tổng hợp giọng
│   │   ├── base.py                 # Abstract Class BaseTTSEngine
│   │   ├── edge_tts_engine.py      # Microsoft Edge TTS (vi-VN-HoaiMy, en-US-Jenny, ja-JP-Nanami)
│   │   ├── kokoro_engine.py        # Kokoro 82M Local Neural TTS
│   │   ├── fish_speech_engine.py   # Fish-Speech Voice Cloning
│   │   └── factory.py              # TTSEngineFactory: Lựa chọn engine theo cấu hình
│   │
│   ├── services/                   # Logic nghiệp vụ bổ trợ
│   │   ├── cache_service.py        # Tính toán mã băm MD5 và lưu trữ cache
│   │   └── batch_synthesizer.py    # Điều phối asyncio.gather và Semaphore giới hạn concurrency
│   │
│   ├── workers/                    # Background Worker xử lý hàng đợi Redis
│   │   ├── consumer.py             # Lắng nghe job SYNTHESIZE_CHUNKS từ Redis
│   │   └── tts_worker.py           # Thực thi render toàn bộ chunks của bài học
│   │
│   └── schemas/                    # Pydantic Request & Response Models
│       ├── tts_request.py
│       └── voice_metadata.py
│
├── tests/                          # Pytest Unit Tests
│   ├── test_edge_tts.py            # Kiểm tra khả năng sinh tiếng của Edge-TTS
│   ├── test_cache_service.py       # Kiểm tra thuật toán băm và truy xuất cache MD5
│   └── conftest.py
│
├── Dockerfile                      # Multi-stage Python build
├── requirements.txt                # edge-tts, pydantic, redis, httpx, torch (nếu dùng local model)
└── pyproject.toml
```

---

## 3. DANH SÁCH GIỌNG ĐỌC MẶC ĐỊNH (DEFAULT PRESETS)

* **Tiếng Việt (`vi`):**
  - Nữ: `vi-VN-HoaiMyNeural` (Truyền cảm, chuẩn giọng phát thanh).
  - Nam: `vi-VN-NamMinhNeural` (Trầm ấm, rõ ràng).
* **Tiếng Anh (`en`):**
  - Nữ: `en-US-JennyNeural` (Tự nhiên, tốc độ tiêu chuẩn học thuật).
  - Nam: `en-US-GuyNeural` (Giọng Mỹ chuẩn, phát âm rành mạch).
* **Tiếng Nhật (`ja`):**
  - Nữ: `ja-JP-NanamiNeural` (Chuẩn giọng Tokyo NHK).
  - Nam: `ja-JP-KeitaNeural`.

---

## 4. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

```bash
# 1. Navigate to service directory
cd services/tts-engine

# 2. Activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start service
uvicorn src.main:app --host 0.0.0.0 --port 8002 --reload
```

Kiểm tra danh sách giọng đọc qua API:
```bash
curl http://localhost:8002/api/v1/voices
```
Chạy thử nghiệm kiểm tra tính năng tổng hợp tiếng:
```bash
pytest tests/ -v
```
