# 🤖 SCRIPT-LLM: SYNTAX PARSER & LLM TRANSLATION WORKER
## DỰ ÁN: MEOWSHADOW LAB (MSL-LLM)
### BÓC TÁCH CÚ PHÁP ĐA NGỮ, CHUNKING SHADOWING & TÍCH HỢP OLLAMA QWEN 3 8B

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `services/script-llm/` |
| **Ngôn ngữ & Runtime** | **Python 3.11+ / Python 3.12** |
| **Framework Web** | **FastAPI** + **Uvicorn** (Asynchronous ASGI) |
| **Data Validation** | **Pydantic v2** |
| **LLM Model** | **Qwen 3 8B (`qwen3:8b`)** chạy cục bộ qua **Ollama** |
| **Message Broker** | **Redis 7** (Redis Streams / Task Queue Consumer) |
| **Cổng mặc định** | `8001` (Docker Container & Host) |

---

## 1. VAI TRÒ & CHỨC NĂNG CỐT LÕI

`script-llm` là vi dịch vụ chịu trách nhiệm tiền xử lý văn bản, bóc tách cấu trúc kịch bản và tích hợp AI tạo sinh:
1. **Regex Tag Parser:** Phân tích cú pháp văn bản có chứa các nhãn ngôn ngữ như `[VI]`, `[EN]`, `[JA]`, tự động tách thành các đơn vị câu độc lập kèm ngôn ngữ tương ứng mà không làm rớt chữ hay sai cú pháp.
2. **AI Translation & Segmentation:** Khi người dùng nhập văn bản thuần (chưa có bản dịch), service kết nối với Ollama chạy model **Qwen 3 8B** để:
   - Dịch nghĩa chuẩn ngữ cảnh học thuật / podcast.
   - Chia văn bản thành từng cụm nhỏ (3–4 câu mỗi khối) để người học không bị quá tải khi nghe và nhại theo.
3. **Shadowing Chunker:** Đảm bảo thứ tự xuất hiện chuẩn phương pháp Shadowing: Câu tiếng Việt (nghĩa gợi nhớ) đi trước $\rightarrow$ Câu ngoại ngữ (mục tiêu luyện phát âm) đi ngay sau.
4. **Audio Pacing & Duration Estimator:** Tính toán số từ / số ký tự (hỗ trợ tiếng Nhật CPM), ước tính thời lượng đọc và các khoảng lặng chuẩn cho Shadowing (`silence_after_vi_sec=1.5s`, `silence_after_target_sec=3.5s`, `silence_between_sentences_sec=0.5s`).

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ

```text
services/script-llm/
├── src/
│   ├── main.py                     # Khởi tạo FastAPI App, CORS & Lifespan event handlers
│   ├── config.py                   # Pydantic BaseSettings đọc biến môi trường (OLLAMA_HOST, LLM_MODEL)
│   │
│   ├── api/                        # HTTP Endpoints
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── health.py       # GET /api/v1/health: Kiểm tra trạng thái & kết nối Ollama
│   │   │   │   ├── parse.py        # POST /api/v1/parse: Bóc tách thẻ [VI], [EN], [JA]
│   │   │   │   ├── translate.py    # POST /api/v1/translate & POST /api/v1/auto-chunk: Gọi Qwen 3 8B
│   │   │   │   └── estimate.py     # POST /api/v1/estimate: Đo đạc từ vựng & thời lượng audio
│   │   │   └── router.py           # Gom nhóm API v1
│   │
│   ├── core/                       # Thành phần lõi hệ thống
│   │   ├── logging.py              # Structured Logger
│   │   └── exceptions.py           # Custom Exception handlers
│   │
│   ├── prompts/                    # System Prompts tối ưu hóa cho Qwen 3 8B
│   │   ├── chunking.py             # Prompt phân đoạn 3–4 câu & xuất JSON
│   │   └── translation.py          # Prompt dịch ngữ cảnh nói chuẩn TTS
│   │
│   ├── services/                   # Nghiệp vụ xử lý
│   │   ├── script_tokenizer.py     # Regex Engine bóc tách cú pháp thẻ đa ngữ & chuẩn hóa
│   │   ├── ollama_client.py        # Asynchronous HTTP Client tới Ollama API
│   │   ├── llm_pipeline.py         # Pipeline phân đoạn, dịch thuật & ghép cặp
│   │   └── metrics_estimator.py    # Đo đạc WPM/CPM & dự đoán timeline audio
│   │
│   └── schemas/                    # Pydantic Schemas
│       ├── chunk.py                # ScriptChunk, ChunkPair
│       ├── parse.py                # ParseRequest, ParseResponse
│       ├── translate.py            # TranslateRequest, TranslateResponse
│       ├── script_response.py      # AutoChunkTranslateRequest, AutoChunkTranslateResponse
│       └── metrics.py              # EstimateRequest, EstimateResponse, ChunkMetric
│
├── tests/                          # Pytest Suite (30 unit & integration tests)
│   ├── test_service_init.py        # Kiểm thử khởi tạo config, schemas, healthcheck
│   ├── test_tokenizer.py           # Kiểm thử bóc tách thẻ [VI], [EN], [JA], dấu câu
│   ├── test_llm_pipeline.py        # Kiểm thử Prompt engine, JSON parsing & fallback
│   ├── test_metrics_estimator.py   # Kiểm thử đếm từ ngữ & tính pacing silence
│   └── test_parser.py              # Benchmark xử lý kịch bản thô 1.500 từ
│
├── Dockerfile                      # Multi-stage container Python 3.11-slim
├── requirements.txt                # Dependencies (FastAPI, Uvicorn, Pydantic, HTTPX, Pytest)
└── pyproject.toml                  # Poetry & Pytest configurations
```

---

## 3. DANH SÁCH HTTP APIS CỐT LÕI

| Phương thức | Đường dẫn | Chức năng | Payload chính |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Định danh microservice | -- |
| `GET` | `/health` | Top-level Docker healthcheck | -- |
| `GET` | `/api/v1/health` | Kiểm tra kết nối Ollama & danh sách models | -- |
| `POST` | `/api/v1/parse` | Bóc tách thẻ cú pháp `[VI]`, `[EN]`, `[JA]` | `{"raw_text": "...", "target_lang": "en"}` |
| `POST` | `/api/v1/translate` | Dịch thuật văn bản qua Qwen 3 8B | `{"text": "...", "source_lang": "vi", "target_lang": "en"}` |
| `POST` | `/api/v1/auto-chunk` | Tự động phân đoạn 3–4 câu & dịch văn bản thô 1.500 từ | `{"raw_text": "...", "target_lang": "en", "sentences_per_chunk": 3}` |
| `POST` | `/api/v1/estimate` | Tính toán số từ, thời lượng đọc & khoảng lặng Pacing | `{"raw_text": "...", "silence_after_vi_sec": 1.5, "silence_after_target_sec": 3.5}` |

---

## 4. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

### Yêu Cầu Môi Trường:
* Python 3.11+ hoặc 3.12.
* Ollama đã được cài đặt trên máy host (`http://localhost:11434`) và kéo model `qwen3:8b`:
  ```bash
  ollama pull qwen3:8b
  ```

### Các Bước Khởi Chạy:
```bash
# 1. Điều hướng tới thư mục service
cd services/script-llm

# 2. Tạo virtual environment
python3 -m venv .venv
source .venv/bin/activate

# 3. Cài đặt dependencies
pip install -r requirements.txt

# 4. Khởi chạy FastAPI service trên cổng 8001
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

Kiểm tra Swagger Docs tại: `http://localhost:8001/docs`.

Chạy toàn bộ test suite kiểm thử tự động:
```bash
pytest tests/ -v
```
