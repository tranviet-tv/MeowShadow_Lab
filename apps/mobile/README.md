# 📱 MOBILE APP: REACT NATIVE / EXPO (IOS & ANDROID)
## DỰ ÁN: MEOWSHADOW LAB (MSL-MOB)
### TRÌNH PHÁT BÀI HỌC CHẠY NỀN (BACKGROUND AUDIO), ĐIỀU KHIỂN MÀN HÌNH KHÓA & OFFLINE-FIRST SQLITE

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `apps/mobile/` |
| **Nền Tảng Hỗ Trợ** | **iOS & Android** |
| **Framework & Tools** | **React Native** + **Expo SDK 51+** (Expo Router, TypeScript) |
| **Audio Engine** | **`react-native-track-player`** / **`expo-av`** (Hỗ trợ Background Playback & Lockscreen) |
| **Cơ Sở Dữ Liệu Cục Bộ** | **OP-SQLite** / **Expo SQLite** (Offline-First Storage) |
| **State Management** | **Zustand** (Offline store, Player store) |

---

## 1. VAI TRÒ & CÁC TÍNH NĂNG NỔI BẬT

`apps/mobile` mang trải nghiệm học ngoại ngữ qua phương pháp Shadowing vào cuộc sống hàng ngày (nghe thụ động khi chạy bộ, lái xe, làm việc nhà):

1. **Phát Âm Thanh Chạy Nền (Background Audio Playback):**
   - Ứng dụng tiếp tục phát mượt mà khi người dùng khóa màn hình điện thoại hoặc chuyển sang ứng dụng khác.
   - Tự động tạm dừng khi có cuộc gọi đến và tự động phát tiếp khi kết thúc cuộc gọi (Audio Focus Management).
2. **Điều Khiển Trên Màn Hình Khóa & Trung Tâm Điều Khiển (Lock-screen Controls):**
   - Tích hợp với **Apple iOS Now Playing** và **Android Media Notification**.
   - Hiển thị đầy đủ: Tiêu đề bài học, thời gian phát, thanh trượt thời gian, nút Play/Pause, tua lùi 5s và nút lặp lại câu vừa nghe.
   - Hỗ trợ điều khiển qua nút bấm trên tai nghe (AirPods / Bluetooth Headphones) và Apple Watch / Android Auto.
3. **Chế Độ Học Ngoại Tuyến 100% (Offline-First Architecture):**
   - Cho phép người dùng bấm "Tải về" để lưu file âm thanh `.mp3` và phụ đề `.srt` trực tiếp vào bộ nhớ máy.
   - Toàn bộ metadata được lưu vào cơ sở dữ liệu SQLite nội bộ (`local_lessons`).
   - Người dùng có thể học trên máy bay hoặc vùng không có sóng di động mà không gặp bất kỳ gián đoạn nào.
4. **Cơ Chế Đồng Bộ Tiến Trình Thông Minh (Offline Sync Engine):**
   - Mọi thao tác nghe dở, số lần nhại câu được ghi nhận vào bảng `offline_progress` kèm trường `version` tăng dần.
   - Khi thiết bị kết nối lại Internet, service chạy ngầm sẽ tự động đẩy dữ liệu lên Golang Gateway (`POST /api/v1/progress/sync`) để đồng bộ tiến độ với Web Studio.

---

## 2. CẤU TRÚC THƯ MỤC NỘI BỘ (EXPO ROUTER)

```text
apps/mobile/
├── assets/                         # Splash screen, App icon, Sound effects, Local fonts
├── src/
│   ├── app/                        # Expo Router (File-based Navigation)
│   │   ├── (auth)/                 # Nhóm màn hình Đăng nhập / Đăng ký
│   │   │   ├── login.tsx
│   │   │   └── register.tsx
│   │   │
│   │   ├── (tabs)/                 # Tab Bar Navigation chính
│   │   │   ├── _layout.tsx         # Cấu hình Icons và màu sắc của 4 Tabs
│   │   │   ├── index.tsx           # Tab 1: Thư viện bài học (Home Library)
│   │   │   ├── player.tsx          # Tab 2: Màn hình phát âm thanh đầy đủ (Full Player)
│   │   │   ├── downloads.tsx       # Tab 3: Quản lý bài học đã tải về (Offline Storage)
│   │   │   └── profile.tsx         # Tab 4: Cài đặt tài khoản & Trạng thái đồng bộ
│   │   │
│   │   ├── lesson/
│   │   │   └── [id].tsx            # Màn hình chi tiết bài học & bắt đầu luyện nghe
│   │   └── _layout.tsx             # Root Navigation Container, Audio Service Initializer
│   │
│   ├── components/                 # Tầng UI Components chuẩn Native
│   │   ├── player/
│   │   │   ├── MiniPlayer.tsx      # Thanh phát nhạc thu nhỏ ghim sát đáy màn hình
│   │   │   ├── KaraokeScrollView.tsx # Danh sách cuộn chữ to, dễ đọc khi đang di chuyển
│   │   │   ├── AudioControls.tsx   # Cụm nút bấm lớn: Play/Pause, Tua, Lặp lại câu
│   │   │   └── RepeatBadge.tsx     # Đếm số lần nhại lại câu (Shadowing Counter)
│   │   ├── lessons/                # LessonListItem, OfflineDownloadButton
│   │   └── ui/                     # Nút bấm, typography, thẻ bài học chuẩn Native
│   │
│   ├── services/                   # Dịch vụ nền tảng cốt lõi
│   │   ├── audio/
│   │   │   ├── BackgroundAudio.ts  # Cấu hình service phát nhạc nền khi tắt màn hình
│   │   │   └── LockScreenControls.ts # Tích hợp Notification Media & Lockscreen metadata
│   │   ├── database/               # Cơ sở dữ liệu SQLite cục bộ
│   │   │   ├── sqlite.ts           # Mở kết nối SQLite nội bộ trên thiết bị
│   │   │   ├── migrations.ts       # Khởi tạo bảng local_lessons & offline_progress
│   │   │   └── progressRepo.ts     # Truy vấn lưu và đọc tiến trình nghe offline
│   │   └── sync/
│   │       └── offlineSync.ts      # Engine tự động so khớp version và đẩy dữ liệu lên server
│   │
│   ├── stores/                     # Quản lý State bằng Zustand
│   │   ├── playerStore.ts          # State của bài đang phát, offset mốc giây
│   │   ├── offlineStore.ts         # Danh sách bài đã tải về máy
│   │   └── authStore.ts            # Token xác thực lưu trong Expo SecureStore
│   │
│   ├── hooks/                      # Custom Hooks
│   │   ├── useAudioPlayback.ts     # Hook kết nối với Track Player
│   │   ├── useNetworkStatus.ts     # Hook theo dõi trạng thái mạng (Online / Offline)
│   │   └── useOfflineLessons.ts    # Hook đọc danh sách bài học từ SQLite
│   │
│   └── theme/                      # Bảng màu Dark/Light Mode và font chữ tối ưu di động
│
├── app.json                        # Cấu hình Expo, Bundle ID, Permissions (Audio Background)
├── babel.config.js
├── tsconfig.json
└── package.json
```

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU SQLITE CỤC BỘ

Bảng dữ liệu lưu trữ trên thiết bị phục vụ chế độ ngoại tuyến:
```sql
-- 1. Downloaded lessons storage
CREATE TABLE IF NOT EXISTS local_lessons (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    target_language TEXT NOT NULL,
    duration_sec REAL DEFAULT 0.0,
    local_audio_path TEXT NOT NULL,  -- Device storage path: app-data://audio/lesson_1.mp3
    local_srt_path TEXT NOT NULL,    -- Device storage path: app-data://subtitles/lesson_1.srt
    transcript_chunks TEXT NOT NULL, -- JSON dialogue chunks
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Offline playback progress storage
CREATE TABLE IF NOT EXISTS offline_progress (
    lesson_id TEXT PRIMARY KEY,
    playback_offset_sec REAL DEFAULT 0.0,
    shadowing_repeat_count INTEGER DEFAULT 0,
    is_completed INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,       -- Revision counter for sync resolution
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. HƯỚNG DẪN KHỞI CHẠY CỤC BỘ (LOCAL DEVELOPMENT)

### Yêu Cầu Môi Trường:
* Node.js 20+ và `pnpm`.
* Ứng dụng **Expo Go** trên điện thoại iOS / Android hoặc iOS Simulator / Android Emulator.

### Các Bước Khởi Chạy:
```bash
# 1. At repository root:
pnpm install

# 2. Start Expo Dev Server:
pnpm --filter mobile start
```

* Quét mã QR bằng ứng dụng Expo Go để chạy thử trực tiếp trên điện thoại thật.
* Nhấn `i` để mở iOS Simulator, nhấn `a` để mở Android Emulator.
