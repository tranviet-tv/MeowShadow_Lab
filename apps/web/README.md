# 💻 WEB STUDIO: NEXT.JS 15+ WEB STUDIO & KARAOKE PLAYER
## DỰ ÁN: MEOWSHADOW LAB (MSL-WEB)
### GIAO DIỆN SOẠN THẢO KỊCH BẢN, WAVEFORM VISUALIZER, INTERACTIVE KARAOKE & WEBSOCKET PROGRESS

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `apps/web/` |
| **Framework & Runtime** | **Next.js 15+ (App Router, Server Actions, React 19)** |
| **Ngôn ngữ** | **TypeScript 5+** |
| **Styling & Icons** | **Tailwind CSS v3/v4** + **Lucide React** + **Framer Motion** |
| **State Management** | **Zustand** (Cực nhẹ, Type-safe toàn cục) |
| **Audio Visualizer** | **Wavesurfer.js / Canvas Audio API** |
| **Cổng mặc định** | `3000` (Docker Container & Host) |

---

## 1. VAI TRÒ & CÁC TÍNH NĂNG NỔI BẬT

`apps/web` là cổng thông tin trung tâm dành cho người sáng tạo nội dung bài học và người học trên máy tính:
1. **Bảng Soạn Thảo Kịch Bản (Bilingual Script Editor):**
   - Hỗ trợ 2 chế độ soạn thảo: Đan xen thẻ (`[VI]`, `[EN]`, `[JA]`) hoặc Song song 2 cột (Side-by-side).
   - Tự động đếm từ (Word Count) và ước tính tổng thời lượng bài học (Estimated Duration) theo thời gian thực.
   - Nút "Nghe thử câu này": Gọi trực tiếp API TTS để nghe thử âm thanh của câu đang soạn.
2. **Bộ Điều Khiển Pacing (Pacing & Voice Controller):**
   - Thanh trượt điều chỉnh khoảng lặng chính xác: Lặng sau câu VI (1.5s), Lặng sau câu EN/JA (3.5s), Khoảng nghỉ giữa các câu (0.5s).
   - Voice Selector: Lựa chọn giọng đọc Nam/Nữ đa ngữ kèm nút nghe thử giọng mẫu.
3. **Modal Tiến Trình WebSocket (Realtime Progress Modal):**
   - Lắng nghe sự kiện `ws://localhost:8000/ws/v1/progress/{taskId}`.
   - Hiển thị thanh tiến trình sống động qua từng giai đoạn: *Phân đoạn cú pháp (10%) $\rightarrow$ Đang tổng hợp giọng nói (15%–80%) $\rightarrow$ Ghép nối & Chuẩn hóa âm lượng (85%–95%) $\rightarrow$ Hoàn tất (100%)*.
   - Tự động chuyển hướng sang Trình phát Karaoke khi bài học hoàn thành.
4. **Trình Phát Karaoke Tương Tác (Interactive Karaoke Player):**
   - Tự động cuộn trang (Auto-scroll) và làm sáng nổi bật (Highlight) câu đang được phát.
   - Nhấp vào câu bất kỳ trong phụ đề để tua bài phát đến đúng mốc thời gian đó tức thì.
   - Phím tắt tiện lợi: `Space` (Play/Pause), `J / L` (Tua lùi / tiến 5 giây), `R` (Nhại lại câu hiện tại).
   - Hiển thị sóng âm thanh trực quan (Waveform Visualizer).

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ (APP ROUTER)

```text
apps/web/
├── public/                         # Favicon, Logo, Cues âm thanh mẫu, Fonts
├── src/
│   ├── app/                        # Next.js 15 App Router
│   │   ├── (auth)/                 # Nhóm trang xác thực người dùng
│   │   │   ├── login/page.tsx      # Đăng nhập bằng Email & Mật khẩu
│   │   │   ├── register/page.tsx   # Đăng ký tài khoản
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/            # Nhóm màn hình làm việc chính (Persistent Layout)
│   │   │   ├── layout.tsx          # Khung giao diện chung: Sidebar + Top Navbar
│   │   │   ├── page.tsx            # Tổng quan Dashboard & Thống kê luyện nghe
│   │   │   ├── studio/             # Studio Soạn thảo & Tạo Audio
│   │   │   │   └── page.tsx
│   │   │   ├── lessons/            # Thư viện bài học
│   │   │   │   ├── page.tsx        # Danh sách bài học (Phân trang, Tìm kiếm, Lọc)
│   │   │   │   └── [id]/page.tsx   # Chi tiết bài học & Trình phát Karaoke đầy đủ
│   │   │   └── settings/           # Cấu hình giọng đọc mặc định & Pacing presets
│   │   │       └── page.tsx
│   │   │
│   │   ├── api/                    # Route Handlers nội bộ (BFF nếu cần)
│   │   ├── layout.tsx              # Root Layout (Theme Provider, Inter Font)
│   │   ├── error.tsx               # UI xử lý lỗi toàn cục
│   │   ├── not-found.tsx           # Trang 404 thân thiện
│   │   └── globals.css             # Tailwind CSS & Custom Animation Tokens
│   │
│   ├── components/                 # Tầng UI Components tái sử dụng
│   │   ├── ui/                     # Primitives components (Button, Slider, Modal, Tabs, Toast)
│   │   ├── studio/                 # Components của Studio
│   │   │   ├── ScriptEditor.tsx    # Bảng soạn thảo thẻ [VI], [EN], [JA]
│   │   │   ├── PacingControl.tsx   # Sliders điều chỉnh khoảng lặng 1.5s / 3.5s
│   │   │   ├── VoiceSelector.tsx   # Chọn giọng đọc Nam / Nữ
│   │   │   └── ProgressModal.tsx   # Popup hiển thị % WebSocket tiến trình
│   │   ├── player/                 # Components của Trình phát Audio
│   │   │   ├── KaraokePlayer.tsx   # Auto-scroll & Highlight câu thoại theo mốc giây
│   │   │   ├── Waveform.tsx        # Hiển thị biểu đồ sóng âm thanh
│   │   │   ├── PlaybackBar.tsx     # Nút Play/Pause, tua ±5s, chọn tốc độ 0.75x-1.5x
│   │   │   └── SubtitleLine.tsx    # Từng dòng phụ đề có thể bấm tua
│   │   ├── lessons/                # LessonCard, LessonTable, SearchFilter
│   │   └── common/                 # Header, Sidebar, ThemeToggle, WebSocketIndicator
│   │
│   ├── hooks/                      # Custom React Hooks
│   │   ├── useAudioPlayer.ts       # Điều khiển thẻ HTML5 Audio & sync timeupdate
│   │   ├── useKaraokeSync.ts       # Tính toán câu đang phát dựa trên mốc giây phụ đề
│   │   ├── useWebSocketProgress.ts # Kết nối WebSocket theo dõi task_id
│   │   └── useDebounce.ts
│   │
│   ├── stores/                     # Quản lý State toàn cục bằng Zustand
│   │   ├── usePlayerStore.ts       # Trạng thái audio, volume, tốc độ, câu hiện tại
│   │   ├── useStudioStore.ts       # Kịch bản nháp, cấu hình pacing đang soạn
│   │   └── useAuthStore.ts         # Quản lý Session, UserProfile và Token
│   │
│   └── lib/                        # Tiện ích bổ trợ (Utilities)
│       ├── api.ts                  # Khởi tạo SDK từ @meowshadow/api-client
│       ├── utils.ts                # Hàm format thời gian (05:24), format dung lượng
│       └── constants.ts
│
├── Dockerfile                      # Multi-stage build chế độ Standalone tối ưu RAM
├── next.config.ts                  # Cấu hình Next.js (Image optimization, standalone)
├── tailwind.config.ts              # Theme colors, dark mode, animation
├── tsconfig.json
└── package.json
```

---

## 3. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

### Yêu Cầu Môi Trường:
* Node.js 20+ và `pnpm` (phiên bản 9.x).
* Backend `gateway-core` đang chạy tại `http://localhost:8000`.

### Các Bước Khởi Chạy:
```bash
# 1. At repository root:
pnpm install

# 2. Start web application:
pnpm --filter web dev
```

Ứng dụng sẽ hoạt động tại: `http://localhost:3000`.
