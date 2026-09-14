import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'MeowShadow Web Studio - Trình Soạn Thảo & Tạo Audio Shadowing',
  description:
    'Nền tảng biên tập kịch bản song ngữ đa ngữ (Việt - Anh - Nhật), điều chỉnh nhịp điệu Pacing và tổng hợp âm thanh Shadowing chuẩn podcast.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`dark ${inter.variable}`}>
      <body className="bg-background text-foreground min-h-screen antialiased selection:bg-indigo-500/30 selection:text-indigo-200 transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
