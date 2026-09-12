# 🎛️ AUDIO-PROCESSOR: PACING, MASTERING & SUBTITLES WORKER
## DỰ ÁN: MEOWSHADOW LAB (MSL-AUDIO)
### CHÈN KHOẢNG LẶNG ĐỊNH MỨC (PACING), MASTERING CHUẨN PHÁT THANH EBU R128 (-16 LUFS) & SINH PHỤ ĐỀ SRT/VTT

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `services/audio-processor/` |
| **Ngôn ngữ & Runtime** | **Python 3.11+** |
| **Engine Xử Lý Âm Thanh** | **FFmpeg 6+** (Hệ thống) + **Pydub** / **ffmpeg-python** |
| **Chuẩn Đo Âm Lượng** | **EBU R128 (-16.0 LUFS)** (Chuẩn Podcast quốc tế Apple Podcasts/Spotify) |
| **Định Dạng Đầu Ra** | **MP3 (192kbps / 44.1kHz / Stereo)** kèm file phụ đề **SRT & WebVTT** |
| **Cổng mặc định** | `8003` (Docker Container) |

---

## 1. VAI TRÒ & NGUYÊN LÝ THIẾT KẾ

`audio-processor` là khâu cuối cùng trong dây chuyền sản xuất bài học audio 10 phút. Dịch vụ này biến các file clips rời rạc thành một sản phẩm âm thanh hoàn chỉnh, chuyên nghiệp và có thể học tập được ngay:

```mermaid
flowchart LR
    INPUT[Danh sách Audio Clips rời] --> SILENCE[1. Chèn Khoảng Lặng Pacing\n1.5s VI | 3.5s EN/JA]
    SILENCE --> CUES[2. Chèn Âm Thanh Chime Báo Hiệu]
    CUES --> STITCH[3. Ghép Nối Liền Mạch\nFFmpeg Concatenation]
    STITCH --> LOUDNESS[4. Mastering EBU R128\nChuẩn hóa -16 LUFS]
    LOUDNESS --> EXPORT[5. Xuất File Hoàn Chỉnh\nlesson.mp3 & lesson.srt]
```

1. **Thuật Toán Chèn Khoảng Lặng (Pacing Algorithm):**
   - Không đơn thuần là đọc liên tục như sách nói thông thường, dịch vụ chèn các khoảng lặng kỹ thuật số (Digital Silence) với độ chính xác mili-giây:
     * **1.5 giây sau câu Tiếng Việt:** Đủ để não bộ tiếp nhận ý nghĩa mà không bị ngắt quãng.
     * **3.5 giây sau câu Tiếng Anh / Tiếng Nhật:** Không gian vàng để người học phát âm nhại lại (Shadowing) thành tiếng.
     * **0.5 giây giữa các khối câu:** Tạo nhịp thở tự nhiên.
2. **Mastering Chuẩn Phát Thanh EBU R128:**
   - Sử dụng bộ lọc FFmpeg `loudnorm` với thông số `I=-16.0:LRA=7.0:TP=-1.5`. Đảm bảo âm lượng của toàn bộ bài học đồng đều, không bị đoạn quá to hoặc đoạn quá nhỏ khi người học đeo tai nghe.
   - Thêm hiệu ứng âm thanh **Fade In (0.5s)** ở đầu bài và **Fade Out (1.0s)** ở đuôi bài.
3. **Engine Phụ Đề Khớp 100% (Subtitles & Timestamps):**
   - Đo đạc chính xác thời lượng (Duration) thực tế của từng clip âm thanh sau khi ghép nối.
   - Tính toán mốc `start_time` và `end_time` chi tiết đến từng mili-giây và ghi ra 2 file:
     * `.srt`: Định dạng phụ đề chuẩn cho các trình phát media.
     * `.vtt`: Định dạng WebVTT hỗ trợ nhúng trực tiếp vào thẻ HTML5 `<video>` / `<audio>` trên trình duyệt.

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ

```text
services/audio-processor/
├── src/
│   ├── main.py                     # Khởi tạo FastAPI App & Lifespan
│   ├── config.py                   # Cấu hình STORAGE_DIR, REDIS_ADDR, DEFAULT_TARGET_LUFS
│   │
│   ├── api/                        # HTTP Endpoints (Direct Processing)
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── process.py      # POST /api/v1/process: Test quy trình ghép nối
│   │       │   └── health.py
│   │       └── router.py
│   │
│   ├── services/                   # Logic kỹ thuật âm thanh
│   │   ├── silence_generator.py    # Sinh các đoạn AudioSegment im lặng (mili-giây)
│   │   ├── pacing_builder.py       # Lắp ghép kịch bản theo chuỗi: VI -> Silence -> EN -> Silence
│   │   ├── audio_master.py         # Gọi FFmpeg nối clips, chuẩn hóa EBU R128 (-16 LUFS), Fade In/Out
│   │   ├── subtitle_engine.py      # Tính toán timestamps và xuất file SRT & VTT
│   │   └── waveform_builder.py     # Trích xuất dữ liệu đỉnh sóng âm (Peaks) phục vụ visualizer
│   │
│   ├── workers/                    # Background Worker xử lý hàng đợi Redis
│   │   ├── consumer.py             # Lắng nghe job AUDIO_MASTERING từ Redis
│   │   └── audio_worker.py         # Thực thi ghép nối, ghi file vào Storage và publish hoàn tất
│   │
│   └── schemas/                    # Pydantic Schemas
│       ├── process_request.py      # DTO danh sách clips và pacing config
│       └── mastering_result.py     # DTO kết quả (mp3_path, srt_path, duration_sec)
│
├── tests/                          # Pytest Unit Tests
│   ├── test_silence_generator.py   # Kiểm tra độ dài mili-giây của khoảng lặng
│   ├── test_audio_master.py        # Kiểm tra chuẩn hóa âm lượng EBU R128
│   ├── test_subtitle_engine.py     # Kiểm tra tính khớp mốc thời gian phụ đề
│   └── conftest.py
│
├── Dockerfile                      # Container cài sẵn FFmpeg 6+ và Python 3.11
├── requirements.txt                # pydub, ffmpeg-python, redis, pydantic
└── pyproject.toml
```

---

## 3. CÔNG THỨC & THÔNG SỐ MASTERING CHUẨN

* **Định mức âm thanh quốc tế:**
  $$\text{Target Integrated Loudness} = -16.0 \text{ LUFS}$$
  $$\text{Maximum True Peak} = -1.5 \text{ dBFS}$$
  $$\text{Loudness Range (LRA)} = 7.0 \text{ LU}$$
* **Lệnh FFmpeg chuẩn hóa tương đương:**
  ```bash
  ffmpeg -i input.wav -af loudnorm=I=-16:LRA=7:tp=-1.5 -ar 44100 -b:a 192k output.mp3
  ```

---

## 4. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

### Yêu Cầu Môi Trường:
* Python 3.11+.
* Máy tính đã cài đặt **FFmpeg** (trên macOS: `brew install ffmpeg`).

### Các Bước Khởi Chạy:
```bash
# 1. Navigate to service directory
cd services/audio-processor

# 2. Activate Python virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start service
uvicorn src.main:app --host 0.0.0.0 --port 8003 --reload
```

Chạy toàn bộ bộ kiểm thử tự động âm thanh:
```bash
pytest tests/ -v
```
