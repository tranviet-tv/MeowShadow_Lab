'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, Radio, BookOpen, Layers } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-3">
        <Link href="/studio" className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-200">
            <span className="text-lg">🐱</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                MeowShadow <span className="text-indigo-400 font-medium">Studio</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                v3.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal hidden sm:block">
              AI-Powered Bilingual Shadowing & Script Synthesizer
            </p>
          </div>
        </Link>
      </div>

      {/* Center status indicator */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-slate-300 font-medium">Gateway Core:</span>
        <span className="text-emerald-400 font-semibold">:8000 (Online)</span>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-3">
        <Link
          href="/lessons"
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-700"
        >
          <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
          <span>Thư viện bài học</span>
        </Link>

        <ThemeToggle />

        {/* User avatar indicator */}
        <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-indigo-400/30">
            TV
          </div>
        </div>
      </div>
    </header>
  );
}
