'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sliders,
  BookOpen,
  Settings,
  Sparkles,
  Headphones,
  FileText,
  Activity,
  Layers,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    href: '/studio',
    label: 'Studio Soạn Thảo',
    icon: FileText,
    badge: 'P0',
  },
  {
    href: '/lessons',
    label: 'Thư Viện Bài Học',
    icon: BookOpen,
  },
  {
    href: '/settings',
    label: 'Cấu Hình & Presets',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-slate-950/50 flex-shrink-0 flex flex-col justify-between hidden md:flex min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6">
        {/* Navigation Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
            Không gian làm việc
          </p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/studio' && pathname === '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-500/30 text-indigo-300">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Shadowing Method Info Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/40 via-purple-950/20 to-slate-900 border border-indigo-800/30">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quy Chuẩn Shadowing</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Nghe câu tiếng Việt <span className="text-emerald-400 font-semibold">[VI]</span> (1.5s ngắt),
            tiếp nối câu ngoại ngữ <span className="text-sky-400 font-semibold">[EN/JA]</span> kèm khoảng lặng
            3.5s để người học nhại lại theo nhịp điệu tự nhiên.
          </p>
        </div>
      </div>

      {/* Bottom Service Status */}
      <div className="p-4 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Script-LLM Worker</span>
          </span>
          <span className="text-emerald-400 font-medium">Ready (:8002)</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Headphones className="w-3.5 h-3.5 text-indigo-400" />
            <span>TTS Engine</span>
          </span>
          <span className="text-indigo-400 font-medium">Edge-TTS</span>
        </div>
      </div>
    </aside>
  );
}
