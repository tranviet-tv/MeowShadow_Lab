# 📦 CÁC THƯ VIỆN DÙNG CHUNG NỘI BỘ (PACKAGES)

Thư mục `packages/` chứa toàn bộ các gói thư viện TypeScript được chia sẻ giữa các ứng dụng trong Monorepo (`apps/web` và `apps/mobile`). Việc tập trung mã nguồn dùng chung giúp đảm bảo tính nhất quán dữ liệu 100%, loại bỏ code trùng lặp (DRY - Don't Repeat Yourself) và dễ dàng bảo trì.

---

## 📋 Danh Sách Các Gói Thư Viện

| Gói Thư Viện | Tên Package | Cẩm Nang Kỹ Thuật Chi Tiết | Mục Đích Sử Dụng |
| :--- | :--- | :--- | :--- |
| **`shared-types`** | **`@meowshadow/types`** | **[shared-types/README.md](./shared-types/README.md)** | Định nghĩa kiểu dữ liệu TypeScript (Interface, Type, Enum) cho toàn hệ thống |
| **`api-client`** | **`@meowshadow/api-client`** | **[api-client/README.md](./api-client/README.md)** | SDK gọi RESTful API & WebSocket Client tự động gắn JWT Token và Refresh |
| **`eslint-config`**| **`@meowshadow/eslint-config`** | - | Quy chuẩn linter thống nhất cho React, Next.js và React Native |
| **`tsconfig`** | **`@meowshadow/tsconfig`** | - | Base tsconfig chuẩn hóa tái sử dụng cho toàn bộ dự án |

---

## 🚀 Cách Cài Đặt Trong Ứng Dụng

Khi thêm tính năng mới trong `apps/web` hoặc `apps/mobile`, chỉ cần khai báo trong file `package.json`:
```json
{
  "dependencies": {
    "@meowshadow/types": "workspace:*",
    "@meowshadow/api-client": "workspace:*"
  }
}
```
Sau đó chạy lệnh:
```bash
pnpm install
```
`pnpm` sẽ tự động tạo symlink tới các thư mục trong `packages/` mà không cần phải publish lên npm registry công cộng.
