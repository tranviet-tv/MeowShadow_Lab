# 🤖 SCRIPT-LLM: SYNTAX PARSER & LLM TRANSLATION WORKER
## DỰ ÁN: MEOWSHADOW LAB (MSL-LLM)
### BÓC TÁCH CÚ PHÁP ĐA NGỮ, CHUNKING SHADOWING & TÍCH HỢP OLLAMA QWEN 2.5

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `services/script-llm/` |
| **Ngôn ngữ & Runtime** | **Python 3.11+** |
| **Framework Web** | **FastAPI** + **Uvicorn** (Asynchronous ASGI) |
| **Data Validation** | **Pydantic v2** |
| **LLM Model** | **Qwen 2.5 (14B / 7B)** chạy cục bộ qua **Ollama** |
| **Message Broker** | **Redis 7** (Redis Streams / Task Queue Consumer) |
| **Cổng mặc định** | `8001` (Docker Container) |

---

## 1. VAI TRÒ & CHỨC NĂNG CỐT LÕI

`script-llm` là vi dịch vụ chịu trách nhiệm tiền xử lý văn bản, bóc tách cấu trúc kịch bản và tích hợp AI tạo sinh:
1. **Regex Tag Parser:** Phân tích cú pháp văn bản có chứa các nhãn ngôn ngữ như `[VI]`, `[EN]`, `[JA]`, tự động tách thành các đơn vị câu độc lập kèm ngôn ngữ tương ứng.
2. **AI Translation & Segmentation:** Khi người dùng nhập văn bản thuần (chưa có bản dịch), service kết nối với Ollama chạy model **Qwen 2.5** để:
   - Dịch nghĩa chuẩn ngữ cảnh học thuật / podcast.
   - Chia văn bản thành từng cụm nhỏ (3–4 câu mỗi khối) để người học không bị quá tải khi nghe và nhại theo.
3. **Shadowing Chunker:** Đảm bảo thứ tự xuất hiện chuẩn phương pháp Shadowing: Câu tiếng Việt (nghĩa gợi nhớ) đi trước $\rightarrow$ Câu ngoại ngữ (mục tiêu luyện phát âm) đi ngay sau.
4. **Redis Task Consumer:** Hoạt động như một background worker, lắng nghe các tác vụ `PARSE_AND_TRANSLATE` do Golang Gateway điều phối.

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ

```text
services/script-llm/
├── src/
│   ├── main.py                     # Khởi tạo FastAPI App & Lifespan event handlers
│   ├── config.py                   # Pydantic BaseSettings đọc biến môi trường (OLLAMA_HOST, REDIS_ADDR)
│   │
│   ├── api/                        # HTTP Endpoints (phục vụ direct test hoặc API nội bộ)
│   │   ├── v1/
│   │   │   ├── endpoints/
│   │   │   │   ├── parse.py        # POST /api/v1/parse: Bóc tách thẻ [VI], [EN], [JA]
│   │   │   │   ├── translate.py    # POST /api/v1/translate: Gọi Ollama dịch tự động
│   │   │   │   └── health.py       # GET /health: Health check cho Docker container
│   │   │   └── router.py           # Gom nhóm API v1
│   │   └── deps.py                 # Dependency Injection (Redis client, Ollama client)
│   │
│   ├── core/                       # Thành phần lõi hệ thống
│   │   ├── logging.py              # Cấu hình Structured Logger
│   │   └── exceptions.py           # Custom Exception handlers
│   │
│   ├── services/                   # Logic nghiệp vụ xử lý văn bản & AI
│   │   ├── tag_parser.py           # Regex Engine bóc tách cú pháp thẻ đa ngữ
│   │   ├── chunker.py              # Thuật toán phân đoạn câu & ước tính thời lượng (WPM)
│   │   └── ollama_client.py        # Wrapper giao tiếp Ollama API + Prompt Templates
│   │
│   ├── workers/                    # Background Worker lắng nghe Redis
│   │   ├── consumer.py             # Vòng lặp lắng nghe Redis Stream / List Queue
│   │   └── task_handlers.py        # Xử lý payload và đẩy kết quả trả về Redis
│   │
│   └── schemas/                    # Pydantic Schemas (Request/Response DTOs)
│       ├── parse_request.py
│       ├── chunk.py                # Schema ScriptChunk (id, order, lang, text)
│       └── script_response.py
│
├── tests/                          # Pytest Unit & Integration Tests
│   ├── test_tag_parser.py          # Kiểm thử bóc tách thẻ [VI], [EN], [JA]
│   ├── test_chunker.py             # Kiểm thử chia cụm câu Shadowing
│   └── conftest.py
│
├── Dockerfile                      # Multi-stage build cho Python container
├── requirements.txt                # Danh sách thư viện Python (fastapi, uvicorn, redis, httpx)
└── pyproject.toml
```

---

## 3. QUY TẮC BÓC TÁCH CÚ PHÁP (REGEX PARSING RULES)

Service hỗ trợ 2 định dạng kịch bản đầu vào:

### Định dạng 1: Đan xen thẻ ngôn ngữ (Interleaved Tags)
```text
[VI]
Sự tập trung là chìa khóa mở ra mọi thành công.
[EN]
Focus is the ultimate key to unlocking success.
```
* Bộ parser sẽ bóc tách thành 2 chunks:
  - `Chunk 1`: `lang: "vi"`, `text: "Sự tập trung là chìa khóa mở ra mọi thành công."`
  - `Chunk 2`: `lang: "en"`, `text: "Focus is the ultimate key to unlocking success."`

### Định dạng 2: Văn bản thô chưa dịch (Raw Text)
Người dùng chỉ nhập đoạn văn tiếng Việt. Service sẽ gửi sang Prompt chuẩn hóa của **Qwen 2.5** để nhận về JSON định dạng từng cặp câu song ngữ.

---

## 4. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

### Yêu Cầu Môi Trường:
* Python 3.11+.
* Ollama đã được cài đặt trên máy host (`http://localhost:11434`) và đã kéo model `qwen2.5:14b` hoặc `qwen2.5:7b`:
  ```bash
  ollama pull qwen2.5:14b
  ```

### Các Bước Khởi Chạy:
```bash
# 1. Navigate to service directory
cd services/script-llm

# 2. Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start FastAPI service
uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload
```

Kiểm tra Swagger Docs tại: `http://localhost:8001/docs`.
Chạy kiểm thử tự động:
```bash
pytest tests/ -v
```
