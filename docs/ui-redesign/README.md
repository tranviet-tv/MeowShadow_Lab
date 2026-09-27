# Kiến Trúc Giao Diện Phân Tách Theo Trang (Multi-Page Architecture)
## MeowShadow Studio v3.2 - Nền Tảng Luyện Nghe & Shadowing AI

Để giải quyết triệt để lỗi xung đột CSS/bố cục khi dồn nhiều màn hình vào cùng 1 trang, toàn bộ ứng dụng đã được tái cấu trúc thành các thư mục độc lập cho từng màn hình chức năng. Mỗi thư mục sở hữu trọn vẹn bộ 3 file: `index.html`, `styles.css`, và `app.js`, liên kết thông suốt với nhau qua thanh điều hướng Sidebar và các nút tác vụ.

---

### 1. Cấu Trúc Thư Mục Trong `docs/ui-redesign/`

```
docs/ui-redesign/
├── index.html                   # Cổng chuyển hướng tự động vào studio/index.html
├── README.md                    # Hướng dẫn chi tiết & tài liệu kiến trúc giao diện
│
├── studio/                      # 1. Studio Soạn Thảo Kịch Bản & Tạo Audio
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── player/                      # 2. Trình Phát Shadowing & Karaoke Chuyên Biệt
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── library/                     # 3. Thư Viện Bài Học & Quản Lý Offline
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── settings/                    # 4. Cấu Hình Động Cơ TTS & Chuẩn Âm Thanh EBU R128
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
└── queue/                       # 5. Hàng Đợi Render Batch Audio
    ├── index.html
    ├── styles.css
    └── app.js
```

---

### 2. Chi Tiết Các Trang & Cách Liên Kết

| Thư Mục | Tên Trang | Chức Năng Chính | Liên Kết Điều Hướng |
| :--- | :--- | :--- | :--- |
| **`studio/`** | **Studio Soạn Thảo** | Quy trình 4 bước chuẩn: Nạp bài AI Qwen 3 (8B) ➔ Soạn thảo cú pháp `[VI]/[EN]` với font Monospace ➔ Chọn giọng đọc Edge-TTS & chỉnh khoảng lặng Pacing ➔ Thanh Sticky Action Bar ở chân trang với nút **"🚀 Tạo Audio Bài Học"**. | Bấm *"Tạo Audio Bài Học"* hoặc nút *"Trình Phát Shadowing"* ở Header/Sidebar sẽ chuyển mượt mà sang `../player/index.html`. |
| **`player/`** | **Trình Phát Shadowing** | Không gian nghe luyện tập độc lập 100% màn hình: Sóng âm Hero Waveform Scrubber phân màu theo chu kỳ Shadowing, Bàn điều khiển (Play/Pause, Tua 5s, Lặp câu `[R]`, Tốc độ `0.8x - 1.5x`, Chế độ chỉ nghe ngoại ngữ), Lời bài học Karaoke Transcript tự động cuộn và nhấp để tua (*Click to seek*). | Nút *"Về Studio Soạn Thảo"* chuyển về `../studio/index.html`. Nút chuyển trang ở Sidebar liên kết tới các mục khác. |
| **`library/`** | **Thư Viện Bài Học** | Banner thống kê (24 bài học, 3.8 giờ, 100% sync mobile); Ô tìm kiếm thời gian thực; Bộ lọc ngôn ngữ; Grid các thẻ bài học. | Nút *"Nghe trên Trình Phát"* chuyển sang `../player/index.html`. Nút *"Chỉnh sửa"* chuyển sang `../studio/index.html`. |
| **`settings/`** | **Cấu Hình & Presets** | Quản lý hạ tầng TTS (Edge-TTS, Kokoro-TTS, Fish-Speech); Kiểm tra ping Ollama local; Cài đặt chuẩn âm lượng EBU R128 (`-16 LUFS`) và định dạng MP3 320kbps / WAV. | Nút *"Về Studio Soạn Thảo"* chuyển về `../studio/index.html`. |
| **`queue/`** | **Hàng Đợi Render** | Bảng giám sát tiến trình xử lý đa luồng (Worker pool 4 threads), thanh % tiến độ thời gian thực và thời gian xử lý. | Nút *"Mở Trình Phát"* / *"Xem Audio"* chuyển thẳng sang `../player/index.html`. |

---

### 3. Cập Nhật UI/UX Toàn Diện (Tuần 1 & Tuần 2) - 11 Vấn Đề Đã Xử Lý

Bộ giao diện đã được chuẩn hóa nhận diện với Logo hệ thống (`assets/logo/logo_dark_mode.svg` & `assets/logo/favicon.svg`) và giải quyết trọn vẹn 11 vấn đề logic & công thái học:

#### Tuần 1: Quick Wins - Sửa Lỗi Logic & Công Thái Học
1. **Dual-Voice Selector (Studio)**: Hiển thị đồng thời cả 2 kênh giọng đọc (Kênh 1: Giọng dẫn Tiếng Việt `Hoài My` và Kênh 2: Giọng đọc Ngoại ngữ `Jenny`), kèm trạng thái gán bài học rõ ràng và bộ chọn nhanh (Pill switchers) kèm nút nghe thử.
2. **Auto-Collapse Bước 1 (Studio)**: Khối "Nạp bài viết thô" có cơ chế Accordion thu gọn tự động thành dải tóm tắt mỏng (`✓ Đã nạp bài viết (1.420 từ) • Nhấn để chỉnh sửa lại nguồn`) sau khi phân đoạn, giải phóng 80% chiều cao cho trình soạn thảo kịch bản.
3. **Tooltip Popover Quy Chuẩn Shadowing**: Đưa widget chú giải 3 bước Shadowing ra khỏi chân Sidebar trái, chuyển thành Floating Popover Tooltip ở thanh công cụ Editor và góc Player. Trả lại Sidebar cho chức năng điều hướng duy nhất.
4. **Playhead & Tua Trực Tiếp (Player)**: Waveform Scrubber tích hợp vạch kim quét Neon phát sáng (Glow Playhead) kèm hai chốt định vị, đường thước đo di chuột (Hover tracking line), tooltip thời gian mini và khả năng click tua tức thì đến câu tương ứng.
5. **Nút Lặp Câu Trực Tiếp (Karaoke Transcript)**: Bổ sung icon nút lặp `🔁 Lặp câu này` trên từng card cặp câu trong danh sách Karaoke. Cho phép người học nhại đi nhại lại một câu khó duy nhất mà không cần tua toàn bài.
6. **Nút "Kiểm Tra Kết Nối" Ollama Chuẩn Button (Settings)**: Nâng cấp thành nút bấm thứ cấp chuẩn (Secondary Button), có hiệu ứng hover mượt mà, spinner xoay tròn khi ping và nhãn phản hồi độ trễ `✓ Kết nối thành công (12ms)`.
7. **Lưu Toàn Cục & Tự Động Lưu (Settings)**: Xoá bỏ nút lưu cục bộ ở góc thẻ Âm thanh để tránh hiểu lầm phạm vi; bổ sung thanh Global Sticky Save Bar ở đáy màn hình với cơ chế Auto-save theo thời gian thực (`✓ Đã tự động lưu tất cả thay đổi lúc hh:mm:ss`) áp dụng đồng thời cho TTS, Ollama và EBU R128.
8. **Định Lượng Tiến Trình Render (Queue)**: Cột Tiến trình được bổ sung số % định lượng (`100%`, `68%`), chi tiết số câu ghép (`Đã ghép 5/5 câu`, `Đang ghép câu 3/5`), thời gian render EBU và đồng hồ đếm ngược `ETA: 1.2s`.

#### Tuần 2: Pro Features - Gia Tăng Giá Trị Trải Nghiệm
9. **Sân Khấu Luyện Thu Âm & Dual-Waveform So Sánh (Player)**: Khi bấm "Thu âm nhại thử", giao diện mở ngay dải sóng âm song song tại trung tâm sân khấu: Sóng âm mẫu của AI ở trên và sóng âm thu trực tiếp từ micro của người học ở dưới với hiệu ứng xung nhịp âm lượng (Audio Pulse).
10. **Bảng Báo Cáo Khớp Giọng Tức Thì - Voice Match Score (Player)**: Tích hợp ngay tại trung tâm sân khấu sau khi thu âm với điểm số khớp ngữ điệu (Pitch & Intonation Match: 88%), độ rõ phát âm (Pronunciation: 91%), nhịp điệu (Rhythm: 85%) và gợi ý cải thiện tức thì.
11. **Chỉ Số Tiến Độ Học Tập & Menu Ngữ Cảnh 3 Chấm (Library)**:
    - Bổ sung Badges phân loại độ khó: `Dễ`, `Trung bình`, `Thử thách`.
    - Thanh theo dõi chu kỳ luyện tập: `Đã luyện: 3/5 chu kỳ` kèm `Điểm cao nhất: 94%`.
    - Thay thế nút bút chỉnh sửa nhỏ bằng menu 3 chấm `•••` ở góc trên card (Chỉnh sửa kịch bản, Render lại audio, Nhân bản, Xoá), nhường toàn bộ chiều rộng chân card cho nút hành động chính "Luyện Tập Ngay".

---

### 4. Cách Mở Trực Tiếp Trên Trình Duyệt

Từ thư mục gốc của dự án, bạn có thể mở bất kỳ trang nào:

```bash
# Mở Studio Soạn Thảo (Trang chính)
open docs/ui-redesign/studio/index.html

# Hoặc mở trực tiếp Trình Phát Shadowing Chuyên Biệt
open docs/ui-redesign/player/index.html

# Hoặc mở Thư Viện Bài Học
open docs/ui-redesign/library/index.html

# Hoặc mở Cấu Hình & Presets
open docs/ui-redesign/settings/index.html

# Hoặc mở Hàng Đợi Render
open docs/ui-redesign/queue/index.html

# Hoặc mở cổng điều hướng chung
open docs/ui-redesign/index.html
```
