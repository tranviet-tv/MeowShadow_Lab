# BẢN ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## DỰ ÁN: NỀN TẢNG LUYỆN NGHE & SHADOWING ĐA NỀN TẢNG - MEOWSHADOW LAB
### TÀI LIỆU YÊU CẦU NGHIỆP VỤ & TÍNH NĂNG HỆ THỐNG

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Tên dự án** | MeowShadow Lab (Text-to-Audio Language Learning & Shadowing Platform) |
| **Mã dự án** | MEOWSHADOW-LAB (MSL-SRS) |
| **Phiên bản** | 3.1.0 |
| **Ngày cập nhật** | 12/09/2026 |
| **Mục tiêu nền tảng** | Web (Next.js 15), Mobile (iOS & Android - React Native/Expo), Backend (Go + Python) |
| **Triển khai môi trường** | **100% Docker-First Containerization (`docker-compose.yml`)** |
| **Trạng thái** | Chính thức phê duyệt (Approved) |

---

## 1. GIỚI THIỆU TỔNG QUAN (INTRODUCTION)

### 1.1. Mục đích
Tài liệu này xác định đầy đủ các yêu cầu chức năng (FR) và phi chức năng (NFR) cho hệ thống **MeowShadow Lab** — một nền tảng chuyển đổi văn bản song ngữ hoặc tam ngữ (Việt - Anh - Nhật) từ 1.300 đến 1.500 từ thành file âm thanh chất lượng cao chuẩn Podcast kéo dài 10 – 12 phút, hỗ trợ tối đa cho phương pháp học ngoại ngữ thụ động (**Passive Listening**) và nhại giọng phản xạ (**Shadowing**).

### 1.2. Đối tượng Người Dùng & Hành Trình Trải Nghiệm (User Journeys)
1. **Trên Web Studio (Máy tính / Laptop):**
   - Soạn thảo hoặc dán bài viết thô (1.300 – 1.500 từ).
   - Sử dụng AI (Qwen 2.5) tự động dịch và phân đoạn 3–4 câu song ngữ `[VI] - [EN]` hoặc `[VI] - [JA]`.
   - Nghe thử câu lẻ (*Preview Chunk*), tùy chỉnh khoảng lặng Pacing.
   - Bấm "Tạo Audio 10 Phút", theo dõi thanh tiến trình thời gian thực.
   - Nghe trực tiếp trên trình phát Karaoke Transcript hoặc xuất file `.mp3`, `.srt`, `.zip`.
2. **Trên Mobile App (iPhone & Android):**
   - Đăng nhập và đồng bộ toàn bộ thư viện bài học từ Web.
   - Luyện nghe chạy nền (**Background Audio**) khi tắt màn hình điện thoại hoặc khi đang di chuyển.
   - Điều khiển nhanh qua màn hình khóa (**Lock-screen Controls**): Tua 5s, Tạm dừng, Nút "Repeat Chunk" để lặp lại ngay câu vừa nghe.
   - Tải bài học về máy để nghe **Offline** hoàn toàn khi không có kết nối Internet.

---

## 2. QUY CHUẨN ÂM THANH & ĐỊNH NHỊP SHADOWING (AUDIO STANDARDS)

### 2.1. Quy tắc Khoảng lặng Nhịp điệu (Smart Silence Pacing)
* **Khoảng lặng giữa các câu trong cùng một khối:** `0.5s`.
* **Khoảng lặng sau khối Tiếng Việt (`[VI] -> [EN]/[JA]`):** Mặc định **`1.5s`** (thời gian để não bộ chuyển đổi ngữ cảnh tư duy).
* **Khoảng lặng sau khối Ngoại ngữ (`[EN]/[JA] -> [VI]`):** Mặc định **`3.5s`** (thời gian vàng để người học nhại giọng hoặc nhẩm lại câu theo phương pháp Shadowing).
* **Âm thanh hiệu ứng chuyển đoạn (Transition Cue):** Tùy chọn chèn tiếng chuông "ding" êm dịu khi chuyển giữa 2 ngôn ngữ.

### 2.2. Tiêu chuẩn Kỹ thuật Âm thanh
* **Định dạng:** MP3 (192kbps / 320kbps) hoặc WAV Lossless (44.1kHz, 16-bit).
* **Chuẩn hóa Âm lượng:** **EBU R128 (-16 LUFS)** đảm bảo âm lượng đồng đều tuyệt đối giữa giọng đọc tiếng Việt và giọng đọc tiếng Anh/Nhật.
* **Hiệu ứng:** Fade-in đầu bài (0.5s) và Fade-out cuối bài (1.0s).

### 2.3. Danh Mục Giọng Đọc AI Mặc Định (Edge-TTS)

| Ngôn ngữ & Thẻ | Giọng Nữ (Female) | Giọng Nam (Male) | Tốc độ chuẩn | Ưu thế phát âm |
| :--- | :--- | :--- | :---: | :--- |
| **Tiếng Việt (`[VI]`)** | `vi-VN-HoaiMyNeural` | `vi-VN-NamMinhNeural` | **1.0x** | Giọng đọc truyền cảm, ấm áp, ngắt nghỉ câu tự nhiên như biên tập viên thời sự. |
| **Tiếng Anh (`[EN]`)** | `en-US-JennyNeural` | `en-US-GuyNeural` / `Brian` | **1.0x** | Chuẩn General American, rõ từng âm đuôi (*ending sounds* /s/, /t/, /d/, /θ/). |
| **Tiếng Nhật (`[JA]`)** | `ja-JP-NanamiNeural` | `ja-JP-KeitaNeural` | **1.0x** | Chuẩn Tokyo, phát âm chuẩn trợ từ và trọng âm cao độ (*pitch accent*). |

---

## 3. YÊU CẦU TÍNH NĂNG CHI TIẾT (FUNCTIONAL REQUIREMENTS)

### 3.1. Phân Hệ Soạn Thảo & Dịch Thuật AI (Script Studio)
* **FR-1.1 (Cú pháp Tag Đa ngữ):** Hỗ trợ nhập liệu theo thẻ cú pháp `[VI] ... [EN] ...` hoặc `[VI] ... [JA] ...`.
* **FR-1.2 (AI Auto-Chunking & Translate):** Sử dụng Local LLM **Qwen 2.5 (14B/7B)** qua Ollama tự động nhận diện ngôn ngữ, chia bài viết dài thành từng cặp 3–4 câu hoàn chỉnh ngữ nghĩa và dịch chuẩn văn phong bản xứ.
* **FR-1.3 (Metrics & Estimator):** Đếm từ thời gian thực, tự động dự toán chính xác độ dài audio đầu ra theo mili-giây dựa trên tham số Pacing.

### 3.2. Phân Hệ Tổng Hợp Giọng Nói (Speech Synthesis)
* **FR-2.1 (Multi-TTS Engine):**
  * *Cloud Default:* Microsoft Edge Neural TTS chất lượng cao, miễn phí 100%.
  * *Local Offline AI:* Fish-Speech 1.5 & F5-TTS (hỗ trợ cả 3 ngôn ngữ VI - EN - JA + Voice Cloning) và Kokoro-TTS v1.0 siêu tốc.
* **FR-2.2 (Smart Clip Cache):** Lưu trữ cache âm thanh từng câu theo mã băm MD5 `(text + voice_id + speed)`, tránh render lại các đoạn không đổi.

### 3.3. Phân Hệ Trình Phát Tương Tác (Karaoke Transcript Player)
* **FR-3.1 (Interactive Transcript):** Tự động cuộn và làm nổi bật câu đang đọc theo thời gian thực.
* **FR-3.2 (Instant Seek):** Bấm vào câu bất kỳ trong kịch bản để nhảy ngay audio đến mốc thời gian đó.
* **FR-3.3 (Hotkeys):** Hỗ trợ phím tắt: `Space` (Play/Pause), `J`/`L` (Tua 5s), `R` (Lặp lại câu hiện tại để nhại giọng).

### 3.4. Phân Hệ Ứng Dụng Di Động (Mobile App iOS & Android)
* **FR-4.1 (Background Audio Service):** Tiếp tục phát audio khi khóa màn hình hoặc chuyển app.
* **FR-4.2 (Lock-screen Controls):** Hiển thị thanh Player trên màn hình khóa điện thoại, hỗ trợ nút "Repeat Chunk".
* **FR-4.3 (Offline Download):** Cho phép tải trọn gói bài học (Audio MP3 + Phụ đề SRT) về bộ nhớ máy để học khi không có mạng.
* **FR-4.4 (Push Notifications):** Gửi thông báo đến thiết bị khi server hoàn thành render bài học.

---

## 4. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

1. **Hiệu năng & Tốc độ Render:** Xử lý kịch bản 1.500 từ tạo ra file audio 10 phút dưới **25 giây** qua Edge-TTS song song.
2. **Độ trễ Phát Âm thanh (Zero Latency Streaming):** Bắt đầu phát audio trên Mobile/Web dưới **100ms** nhờ kỹ thuật HTTP Range Audio Streaming (`206 Partial Content`).
3. **Môi trường Triển khai Độc lập:** Khởi chạy thành công 100% hệ thống thông qua `docker compose up -d` mà không phụ thuộc cài đặt thủ công môi trường máy chủ.
4. **An toàn Kiểu Dữ liệu:** Đồng bộ 100% TypeScript types từ Frontend đến Mobile và Backend Pydantic/Go Structs.
