# 🐱 MeowShadow Lab - Logo & Brand Assets
## HƯỚNG DẪN TÍCH HỢP NEXT.JS (TYPESCRIPT) & TAILWIND CSS

Thư mục chứa trọn bộ tài nguyên logo vector (SVG) và hình ảnh độ phân giải cao (PNG) của dự án **MeowShadow Lab**, đã được căn giữa hoàn hảo trên khung hình vuông (1:1 Aspect Ratio) và tối ưu riêng biệt cho 2 chế độ **Dark Mode** & **Light Mode**.

---

## 📁 Danh Sách File Tài Nguyên

| Tên File | Định Dạng | Màu Sắc / Chế Độ | Mô Tả & Mục Đích Sử Dụng |
| :--- | :---: | :---: | :--- |
| **[`logo_dark_mode.svg`](./logo_dark_mode.svg)** | Vector SVG | Trắng (Trong suốt) | Dành cho giao diện **Dark Mode** (Nền tối: Slate / Black / Dark Navy). |
| **[`logo_light_mode.svg`](./logo_light_mode.svg)** | Vector SVG | Đen (Trong suốt) | Dành cho giao diện **Light Mode** (Nền sáng: White / Light Gray). |
| **[`logo_adaptive.svg`](./logo_adaptive.svg)** | Vector SVG | `currentColor` | Tự động đổi màu theo CSS class `text-white` hoặc `text-black` trong Next.js / Tailwind. |
| **[`favicon.svg`](./favicon.svg)** | Vector SVG | Auto Dark/Light | Favicon cho trình duyệt (Tự động thích ứng với Dark/Light theme của OS). |
| **[`logo_dark_mode.png`](./logo_dark_mode.png)** | Raster PNG | 1024x1024 (Trắng) | Ảnh bitmap trong suốt sắc nét dùng cho Dark Mode. |
| **[`logo_light_mode.png`](./logo_light_mode.png)** | Raster PNG | 1024x1024 (Đen) | Ảnh bitmap trong suốt sắc nét dùng cho Light Mode. |
| **[`logo_preview_dark.png`](./logo_preview_dark.png)** | Raster PNG | 1024x1024 (Dark BG) | Bản preview hoàn chỉnh trên nền Dark `#0B0F19`. |
| **[`logo_preview_light.png`](./logo_preview_light.png)** | Raster PNG | 1024x1024 (Light BG) | Bản preview hoàn chỉnh trên nền Light `#FFFFFF`. |
| **[`logo_512.png`](./logo_512.png)** | Raster PNG | 512x512 App Icon | Dùng làm icon ứng dụng macOS, PWA hoặc Avatar mạng xã hội. |

---

## 💡 Mẫu Component Next.js + TypeScript (`.tsx`)

### 1. Component Logo Thích Ứng (Next.js Image / SVG Component)

```tsx
// frontend/src/components/common/BrandLogo.tsx
import React from 'react';
import Image from 'next/image';

interface BrandLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 36,
  className = '',
  showText = true,
}) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Responsive icon adapting to Dark / Light Mode */}
      <div className="relative" style={{ width: size, height: size }}>
        <Image
          src="/assets/logo/logo_dark_mode.svg"
          alt="MeowShadow Lab"
          fill
          className="hidden dark:block object-contain"
          priority
        />
        <Image
          src="/assets/logo/logo_light_mode.svg"
          alt="MeowShadow Lab"
          fill
          className="block dark:hidden object-contain"
          priority
        />
      </div>

      {showText && (
        <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-violet-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
          MeowShadow <span className="text-slate-400 dark:text-slate-500 font-medium text-xs uppercase tracking-widest ml-1">Lab</span>
        </span>
      )}
    </div>
  );
};
```

### 2. Cấu hình Favicon trong Next.js App Router (`app/layout.tsx`)

```tsx
// frontend/src/app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'MeowShadow Lab - AI Shadowing & Multilingual Audio Studio',
  description: 'Nền tảng tạo audio luyện nghe đa ngữ (Việt - Anh - Nhật) chuẩn podcast và shadowing.',
  icons: {
    icon: '/assets/logo/favicon.svg',
    apple: '/assets/logo/logo_512.png',
  },
};
```
