# 🔌 @MEOWSHADOW/API-CLIENT: SDK GỌI API DÙNG CHUNG CHO WEB & MOBILE
## DỰ ÁN: MEOWSHADOW LAB (MSL-SDK)
### TYPE-SAFE HTTP CLIENT, TỰ ĐỘNG REFRESH JWT TOKEN & WEBSOCKET PROGRESS WRAPPER

---

| Thông Số Kỹ Thuật | Chi Tiết |
| :--- | :--- |
| **Vị trí thư mục** | `packages/api-client/` |
| **Tên Package** | **`@meowshadow/api-client`** |
| **Ngôn ngữ** | **TypeScript 5+** |
| **Thư viện nền tảng** | **Axios / Ky** (HTTP Client) + **Isomorphic WebSocket** |
| **Phụ thuộc nội bộ** | **`@meowshadow/types`** |

---

## 1. VAI TRÒ & CÁC TÍNH NĂNG CỐT LÕI

`@meowshadow/api-client` là thư viện SDK chuẩn hóa, đóng gói toàn bộ logic gọi API tới Golang Gateway:

1. **Tự Động Gắn Access Token (Request Interceptor):**
   - Tự động lấy JWT Access Token từ Storage (Cookie trên Web, SecureStore trên Mobile) và chèn vào Header `Authorization: Bearer <token>`.
2. **Cơ Chế Tự Động Làm Mới Token (Silent Token Refresh):**
   - Khi nhận phản hồi lỗi `401 Unauthorized` với mã `AUTH_TOKEN_EXPIRED`:
     * Đưa các request đang chờ vào một hàng đợi (Queue).
     * Tự động gửi yêu cầu `POST /api/v1/auth/refresh` bằng Refresh Token.
     * Cập nhật Token mới và thực thi lại (Replay) toàn bộ các request bị gián đoạn mà người dùng không hề hay biết (không bị văng khỏi ứng dụng).
3. **Danh Mục Hàm Được Định Kiểu 100% (Type-safe Methods):**
   - Không cần nhớ endpoint URL hay format request body. Các lập trình viên Web và Mobile chỉ cần gọi các phương thức có sẵn với gợi ý code thông minh từ IDE:
     * `client.auth.login(credentials)`
     * `client.lessons.list({ page: 1, limit: 20 })`
     * `client.audio.generate(payload)`
     * `client.progress.sync(progressData)`
4. **Trình Quản Lý WebSocket (WebSocket Progress Wrapper):**
   - Đóng gói logic kết nối tới `ws://localhost:8000/ws/v1/progress/{taskId}`.
   - Tự động kết nối lại nếu mất mạng (Auto-reconnect with Exponential Backoff).
   - Bắn callback sự kiện chuẩn kiểu `onProgress(event: TaskProgressEvent)`.

---

## 2. HƯỚNG DẪN SỬ DỤNG TRONG CODE

```typescript
import { createApiClient } from '@meowshadow/api-client';

// 1. Initialize Client
const api = createApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  getToken: () => localStorage.getItem('access_token'),
  saveToken: (token) => localStorage.setItem('access_token', token),
});

// 2. Fetch lessons via API
const response = await api.lessons.list({ page: 1, limit: 10 });
console.log(response.data.items);

// 3. Listen to render progress via WebSocket
const ws = api.ws.subscribeTaskProgress(taskId, {
  onProgress: (event) => console.log(`Progress: ${event.progressPercent}%`),
  onComplete: (lessonId) => console.log(`Lesson created successfully: ${lessonId}`),
  onError: (err) => console.error(err),
});
```
