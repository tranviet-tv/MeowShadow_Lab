# GIAO KÈO API & KIỂU DỮ LIỆU ĐỒNG BỘ (API & DATA SCHEMAS)
## DỰ ÁN: MEOWSHADOW LAB (MSL-API)
### CHUẨN RESTFUL API, WEBSOCKET PROTOCOL, ERROR CODES & TYPESCRIPT DEFINITIONS

---

| Thông Tin Tài Liệu | Chi Tiết |
| :--- | :--- |
| **Mã tài liệu** | `docs/4_API_AND_DATA_SCHEMAS.md` |
| **Phiên bản** | 3.2.0 (Bổ sung Auth, Library CRUD, Sync & Error Standards) |
| **Cổng tiếp nhận** | `http://localhost:8000` (Go API Gateway) |
| **Định dạng dữ liệu** | JSON / TypeScript / WebSocket Frame |
| **Tài liệu tham chiếu** | [2_ARCHITECTURE_TECHSTACK.md](./2_ARCHITECTURE_TECHSTACK.md) |

---

## 1. QUY CHUẨN PHẢN HỒI LỖI CHUẨN HÓA (STANDARDIZED ERROR SCHEMAS)

Mọi phản hồi lỗi từ Golang Gateway đều bắt buộc tuân theo định dạng JSON đồng nhất:

```json
{
  "success": false,
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Không tìm thấy bài học tương ứng với mã yêu cầu.",
    "details": "Lesson with ID 8a7d3b2a-... does not exist in database.",
    "timestamp": "2026-09-12T08:00:00Z"
  }
}
```

### Bảng Mã Lỗi Hệ Thống (System Error Codes)
* `AUTH_INVALID_CREDENTIALS` (401): Sai email hoặc mật khẩu.
* `AUTH_TOKEN_EXPIRED` (401): JWT Access Token đã hết hạn.
* `AUTH_UNAUTHORIZED` (403): Không có quyền truy cập tài nguyên.
* `VALIDATION_FAILED` (422): Dữ liệu gửi lên không đúng định dạng.
* `LESSON_NOT_FOUND` (404): Bài học không tồn tại.
* `TTS_RATE_LIMITED` (429): Quá giới hạn request TTS tới server.
* `AUDIO_PROCESSING_ERROR` (500): Lỗi khi ghép audio hoặc chuẩn hóa âm lượng.

---

## 2. DANH MỤC RESTFUL API ENDPOINTS (GOLANG GATEWAY)

### 2.1. Nhóm Xác Thực & Người Dùng (Authentication & Users)

#### 🔹 `POST /api/v1/auth/register`
* **Mô tả:** Đăng ký tài khoản người dùng mới.
* **Request Body:**
  ```json
  {
    "email": "user@meowshadow.lab",
    "password": "SecurePassword123!",
    "full_name": "Trần Việt"
  }
  ```
* **Response Body (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "c1f725a3-7bf4-4f40-a1bf-4b4764b85c18",
        "email": "user@meowshadow.lab",
        "full_name": "Trần Việt",
        "created_at": "2026-09-12T08:00:00Z"
      },
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "d7b92f4c-e839-4d23-952a-3c4892bc9381",
      "expires_in_sec": 3600
    }
  }
  ```

---

#### 🔹 `POST /api/v1/auth/login`
* **Mô tả:** Đăng nhập bằng Email và Password, nhận JWT Access Token và Refresh Token.
* **Request Body:**
  ```json
  {
    "email": "user@meowshadow.lab",
    "password": "SecurePassword123!"
  }
  ```
* **Response Body (200 OK):** Cùng định dạng với kết quả đăng ký.

---

#### 🔹 `POST /api/v1/auth/refresh`
* **Mô tả:** Cấp lại Access Token mới khi token cũ hết hạn thông qua Refresh Token.
* **Request Body:**
  ```json
  {
    "refresh_token": "d7b92f4c-e839-4d23-952a-3c4892bc9381"
  }
  ```
* **Response Body (200 OK):**
  ```json
  {
    "success": true,
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in_sec": 3600
  }
  ```

---

#### 🔹 `GET /api/v1/auth/me`
* **Mô tả:** Lấy thông tin tài khoản hiện tại (Yêu cầu Header: `Authorization: Bearer <token>`).
* **Response Body (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "id": "c1f725a3-7bf4-4f40-a1bf-4b4764b85c18",
      "email": "user@meowshadow.lab",
      "full_name": "Trần Việt"
    }
  }
  ```

---

#### 🔹 `POST /api/v1/auth/devices`
* **Mô tả:** Đăng ký device push token (iOS APNs / Android FCM) để nhận thông báo khi server render xong audio.
* **Request Body:**
  ```json
  {
    "device_type": "ios",
    "push_token": "fcm_token_string_abc123"
  }
  ```
* **Response Body (200 OK):** `{"success": true, "message": "Device token registered."}`

---

### 2.2. Nhóm Quản Lý Thư Viện Bài Học (Lessons Library & CRUD)

#### 🔹 `GET /api/v1/lessons`
* **Mô tả:** Lấy danh sách bài học có phân trang, bộ lọc ngôn ngữ và tìm kiếm.
* **Query Parameters:**
  * `page`: Trang hiện tại (mặc định: `1`).
  * `limit`: Số bài trên một trang (mặc định: `20`, tối đa `50`).
  * `target_language`: Lọc theo ngôn ngữ ngoại ngữ (`en` | `ja`).
  * `keyword`: Từ khóa tìm kiếm trong tiêu đề.
* **Response Body (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "b1828f73-67c8-47c1-84fb-057d62057d38",
          "title": "Bài 01: Sức mạnh của sự tập trung",
          "target_language": "en",
          "source_language": "vi",
          "total_words": 1420,
          "duration_sec": 630.5,
          "audio_url": "/api/v1/audio/stream/b1828f73-67c8-47c1-84fb-057d62057d38",
          "created_at": "2026-09-12T07:30:00Z"
        }
      ],
      "pagination": {
        "current_page": 1,
        "total_pages": 5,
        "total_items": 92,
        "limit": 20
      }
    }
  }
  ```

---

#### 🔹 `GET /api/v1/lessons/{lessonId}`
* **Mô tả:** Lấy toàn bộ chi tiết bài học bao gồm cả transcript chunks JSONB và cấu hình pacing đã dùng.
* **Response Body (200 OK):** Chi tiết cấu trúc `LessonItem` đầy đủ.

---

#### 🔹 `DELETE /api/v1/lessons/{lessonId}`
* **Mô tả:** Xóa bài học khỏi hệ thống, đồng thời tự động thu hồi file MP3 và file phụ đề SRT trên shared storage.
* **Response Body (200 OK):**
  ```json
  {
    "success": true,
    "message": "Đã xóa bài học và tệp tin âm thanh liên quan thành công."
  }
  ```

---

### 2.3. Nhóm Tiến Độ Học Tập & Đồng Bộ (Progress Sync)

#### 🔹 `POST /api/v1/progress/sync`
* **Mô tả:** Đồng bộ mốc đang nghe dở và số lần nhại câu từ Web hoặc Mobile App lên Database.
* **Request Body:**
  ```json
  {
    "lesson_id": "b1828f73-67c8-47c1-84fb-057d62057d38",
    "playback_offset_sec": 245.8,
    "shadowing_repeat_count": 12,
    "is_completed": false
  }
  ```
* **Response Body (200 OK):**
  ```json
  {
    "success": true,
    "message": "Tiến độ học tập đã được cập nhật."
  }
  ```

---

### 2.4. Nhóm Soạn Thảo & Khởi Tạo Audio (Script Studio & Audio Generator)

#### 🔹 `POST /api/v1/scripts/auto-translate`
* **Mô tả:** Nhận văn bản thô 1.300–1.500 từ, gọi Python LLM Worker dịch và phân đoạn thành các cặp 3–4 câu.
* **Request Body:**
  ```json
  {
    "raw_text": "Hôm nay chúng ta sẽ tìm hiểu về thói quen của người thành công...",
    "target_language": "en"
  }
  ```
* **Response Body (200 OK):**
  ```json
  {
    "formatted_script": "[VI]\nHôm nay chúng ta sẽ tìm hiểu về thói quen...\n[EN]\nToday we will explore the habits...",
    "chunks": [
      {
        "id": "chunk_1",
        "order": 1,
        "lang": "vi",
        "text": "Hôm nay chúng ta sẽ tìm hiểu về thói quen của người thành công."
      },
      {
        "id": "chunk_2",
        "order": 2,
        "lang": "en",
        "text": "Today we will explore the habits of highly successful people."
      }
    ],
    "word_count": 1420,
    "estimated_duration_sec": 630.5
  }
  ```

---

#### 🔹 `POST /api/v1/audio/generate`
* **Mô tả:** Khởi tạo tác vụ render bài học 10 phút chạy ngầm, trả về `task_id` để theo dõi qua WebSocket.
* **Request Body:**
  ```json
  {
    "title": "Bài 01: Sức mạnh của sự tập trung",
    "target_language": "en",
    "source_text": "[VI]\nSự tập trung là chìa khóa...\n[EN]\nFocus is the key...",
    "tts_engine": "edge-tts",
    "pacing_config": {
      "vi_voice": "vi-VN-HoaiMyNeural",
      "target_voice": "en-US-JennyNeural",
      "vi_speed": 1.0,
      "target_speed": 1.0,
      "silence_after_vi_sec": 1.5,
      "silence_after_target_sec": 3.5,
      "silence_between_sentences_sec": 0.5,
      "insert_cue_sound": false,
      "export_format": "mp3",
      "audio_bitrate": "192k"
    }
  }
  ```
* **Response Body (202 Accepted):**
  ```json
  {
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "QUEUED",
    "message": "Tác vụ tạo audio đã được đưa vào hàng đợi."
  }
  ```

---

### 2.5. Nhóm Range Streaming & Phụ Đề Karaoke (Subtitles)

#### 🔹 `GET /api/v1/audio/stream/{lessonId}`
* **Mô tả:** Phát streaming âm thanh hỗ trợ **HTTP Range Header (`206 Partial Content`)**.
* **Headers:** `Range: bytes=0-1048576`
* **Response:** Binary Audio Stream `audio/mpeg` (Bắt đầu phát dưới 100ms trên iOS/Android/Web).

#### 🔹 `GET /api/v1/lessons/{lessonId}/subtitles`
* **Mô tả:** Lấy danh sách phụ đề chi tiết và mốc thời gian từng câu để đồng bộ Karaoke.
* **Response Body (200 OK):**
  ```json
  {
    "lesson_id": "b1828f73-67c8-47c1-84fb-057d62057d38",
    "subtitles": [
      {
        "id": 1,
        "start_time_sec": 0.5,
        "end_time_sec": 4.8,
        "lang": "vi",
        "text": "Sự tập trung là chìa khóa mở ra mọi thành công."
      },
      {
        "id": 2,
        "start_time_sec": 6.3,
        "end_time_sec": 11.2,
        "lang": "en",
        "text": "Focus is the ultimate key to unlocking success."
      }
    ]
  }
  ```

---

## 3. GIAO THỨC WEBSOCKET TIẾN TRÌNH RENDER (REALTIME WS PROTOCOL)

* **Endpoint:** `ws://localhost:8000/ws/v1/progress/{taskId}`
* **Khung dữ liệu đẩy về Client (Server Push Payload):**
  ```json
  {
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "SYNTHESIZING",
    "progress_percent": 65,
    "completed_chunks": 42,
    "total_chunks": 65,
    "current_step_message": "Đang tổng hợp giọng nói: Đoạn 42/65 (Tiếng Anh)...",
    "result_lesson_id": null
  }
  ```
* **Khi hoàn tất (Status = "COMPLETED"):**
  ```json
  {
    "task_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "status": "COMPLETED",
    "progress_percent": 100,
    "current_step_message": "Đã hoàn thành! File MP3 10 phút và phụ đề đã sẵn sàng.",
    "result_lesson_id": "b1828f73-67c8-47c1-84fb-057d62057d38"
  }
  ```

---

## 4. GÓI KIỂU TYPESCRIPT DÙNG CHUNG TOÀN HỆ THỐNG (`@meowshadow/types`)

Gói `packages/shared-types` được chia sẻ nguyên vẹn giữa `apps/web` (Next.js) và `apps/mobile` (React Native):

```typescript
// packages/shared-types/src/index.ts

export type SupportedLanguage = 'vi' | 'en' | 'ja';
export type TTSEngineType = 'edge-tts' | 'fish-speech' | 'f5-tts' | 'kokoro' | 'piper';
export type DeviceType = 'ios' | 'android' | 'web';

// 1. User & Authentication
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

// 2. Scripts & Pacing
export interface ScriptChunk {
  id: string;
  order: number;
  lang: SupportedLanguage;
  text: string;
  voiceId?: string;
  speedRate?: number;
}

export interface PacingConfig {
  viVoice: string;
  targetVoice: string;
  viSpeed: number;
  targetSpeed: number;
  silenceAfterViSec: number;          // Default 1.5s
  silenceAfterTargetSec: number;      // Default 3.5s
  silenceBetweenSentencesSec: number; // Default 0.5s
  insertCueSound: boolean;
  exportFormat: 'mp3' | 'wav';
  audioBitrate: '192k' | '320k';
}

// 3. Lessons & Progress
export interface LessonItem {
  id: string;
  userId?: string;
  title: string;
  targetLanguage: SupportedLanguage;
  sourceLanguage: 'vi';
  totalWords: number;
  durationSec: number;
  pacingConfig: PacingConfig;
  transcriptChunks: ScriptChunk[];
  audioUrl: string;
  srtUrl: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LessonPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface LessonListResponse {
  items: LessonItem[];
  pagination: LessonPagination;
}

export interface SubtitleTimestamp {
  id: number;
  startTimeSec: number;
  endTimeSec: number;
  lang: SupportedLanguage;
  text: string;
}

export interface LearningProgress {
  lessonId: string;
  playbackOffsetSec: number;
  shadowingRepeatCount: number;
  isCompleted: boolean;
  lastListenedAt?: string;
}

// 4. WebSocket & Task Events
export type TaskStatus = 'QUEUED' | 'PARSING' | 'SYNTHESIZING' | 'MASTERING' | 'COMPLETED' | 'FAILED';

export interface TaskProgressEvent {
  taskId: string;
  status: TaskStatus;
  progressPercent: number;
  completedChunks?: number;
  totalChunks?: number;
  currentStepMessage: string;
  resultLessonId?: string;
  error?: string;
}

// 5. Standardized Error Response
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
}
```
