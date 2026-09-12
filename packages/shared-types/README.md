# 📑 @MEOWSHADOW/TYPES: GÓI KIỂU TYPESCRIPT DÙNG CHUNG
## DỰ ÁN: MEOWSHADOW LAB (MSL-TYPES)
### NGUỒN CHÂN LÝ DUY NHẤT (SINGLE SOURCE OF TRUTH) CHO CÁC GIAO KÈO DỮ LIỆU TOÀN DỰ ÁN

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `packages/shared-types/` |
| **Tên Package** | **`@meowshadow/types`** |
| **Ngôn ngữ** | **TypeScript 5+** |
| **Trạng thái đóng gói** | **Private Workspace Package** (Xuất ra `.d.ts` và `.js` tại `dist/`) |
| **Tài liệu tham chiếu** | [docs/4_API_AND_DATA_SCHEMAS.md](../../docs/4_API_AND_DATA_SCHEMAS.md) |

---

## 1. MỤC ĐÍCH & Ý NGHĨA HỆ THỐNG

Gói `@meowshadow/types` loại bỏ hoàn toàn tình trạng sai lệch dữ liệu giữa Golang Backend, Web Studio (Next.js) và Mobile App (React Native):
1. Khi database PostgreSQL hoặc API Go thay đổi cấu trúc trường (ví dụ: đổi tên trường `pacing_config`), kiểu dữ liệu tại đây được cập nhật.
2. Trình biên dịch TypeScript trên cả Web và Mobile sẽ lập tức báo lỗi đỏ tại đúng các dòng code bị ảnh hưởng trước khi code được triển khai lên môi trường sản xuất.

---

## 2. DANH MỤC KIỂU DỮ LIỆU ĐƯỢC XUẤT (EXPORTS)

```typescript
// 1. User & Authentication
export interface UserProfile { ... }
export interface AuthSession { ... }

// 2. Scripts & Pacing
export type SupportedLanguage = 'vi' | 'en' | 'ja';
export type TTSEngineType = 'edge-tts' | 'fish-speech' | 'kokoro' | 'piper';
export interface ScriptChunk { ... }
export interface PacingConfig { ... }

// 3. Lessons & Progress
export interface LessonItem { ... }
export interface SubtitleTimestamp { ... }
export interface LearningProgress { ... }

// 4. WebSocket & Render Progress
export type TaskStatus = 'QUEUED' | 'PARSING' | 'SYNTHESIZING' | 'MASTERING' | 'COMPLETED' | 'FAILED';
export interface TaskProgressEvent { ... }

// 5. API Response Standards
export interface ApiResponse<T = unknown> { ... }
export interface ApiErrorDetail { ... }
```

---

## 3. CÁCH BIÊN DỊCH VÀ KIỂM TRA

```bash
# 1. Navigate to package directory:
cd packages/shared-types

# 2. Compile type definitions into dist/ directory:
pnpm run build

# 3. Check for type errors:
pnpm run lint
```
