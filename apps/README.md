# 📱 CỤM ỨNG DỤNG NGƯỜI DÙNG CUỐI (APPS)

Thư mục `apps/` chứa toàn bộ các ứng dụng giao diện người dùng (User-Facing Applications) của hệ sinh thái **MeowShadow Lab**. Cả hai ứng dụng Web và Mobile đều sử dụng ngôn ngữ **TypeScript** và chia sẻ chung các kiểu dữ liệu từ `@meowshadow/types` cũng như SDK gọi API từ `@meowshadow/api-client`.

---

## 📋 Danh Sách Các Ứng Dụng

| Ứng Dụng | Công Nghệ & Nền Tảng | Cổng Dev | Cẩm Nang Kỹ Thuật Chi Tiết | Chức Năng Chính |
| :--- | :--- | :---: | :--- | :--- |
| **`web`** | **Next.js 15+ (App Router, Tailwind CSS)** | `3000` | **[web/README.md](./web/README.md)** | Web Studio Soạn thảo kịch bản, Live Waveform, Karaoke Player tương tác |
| **`mobile`** | **React Native / Expo (iOS & Android)** | - | **[mobile/README.md](./mobile/README.md)** | Ứng dụng di động, Background Audio, Lock-screen Player, Offline Storage (SQLite) |

---

## 🔗 Tích Hợp Monorepo (pnpm Workspaces)

Các ứng dụng trong `apps/` tham chiếu trực tiếp đến các thư viện nội bộ trong `packages/`:
```json
{
  "dependencies": {
    "@meowshadow/types": "workspace:*",
    "@meowshadow/api-client": "workspace:*"
  }
}
```
Lợi ích: Bất kỳ sự thay đổi nào về giao kèo dữ liệu ở backend đều được tự động phát hiện và kiểm tra lỗi kiểu (Type-check) trên cả Web và Mobile ngay trong quá trình biên dịch.
