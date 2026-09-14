'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  BookOpen,
  Settings,
  FileText,
  Menu,
  X,
  User,
  Activity,
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [gatewayStatus, setGatewayStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Dynamically check Gateway status
  useEffect(() => {
    let isMounted = true;
    const checkGateway = async () => {
      let isOnline = false;
      // 1. Try local proxied health endpoint
      try {
        const res = await fetch('/health', { signal: AbortSignal.timeout(2000) });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && (data.success || data.status === 'running' || data.data?.status === 'running')) {
            isOnline = true;
          }
        }
      } catch {
        // Fallback to direct gateway port if proxied route is unavailable
      }

      // 2. Direct gateway port check if proxy didn't respond with valid health payload
      if (!isOnline) {
        try {
          const res = await fetch('http://localhost:8000/health', { signal: AbortSignal.timeout(2000) });
          if (res.ok) {
            isOnline = true;
          }
        } catch {
          // Both checks failed
        }
      }

      if (isMounted) {
        setGatewayStatus(isOnline ? 'online' : 'offline');
      }
    };

    checkGateway();
    const interval = setInterval(checkGateway, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close mobile menu on page change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 flex items-center justify-between">
      {/* Brand Logo & Name */}
      <div className="flex items-center space-x-3">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

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

      {/* Center status indicator - Dynamic */}
      <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
        {gatewayStatus === 'online' ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-slate-300 font-medium">Gateway Core:</span>
            <span className="text-emerald-400 font-semibold">:8000 (Online)</span>
          </>
        ) : gatewayStatus === 'checking' ? (
          <>
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <span className="text-slate-400">Đang kiểm tra Gateway...</span>
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-slate-300 font-medium">Gateway:</span>
            <span className="text-rose-400 font-semibold">Offline (Local Demo)</span>
          </>
        )}
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

        {/* User avatar / Auth Link */}
        <Link
          href="/login"
          className="flex items-center space-x-2 pl-2 border-l border-slate-800 hover:opacity-90 transition-opacity"
          title="Tài khoản người dùng"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white ring-2 ring-indigo-400/30">
            TV
          </div>
        </Link>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-slate-950/95 border-b border-slate-800 backdrop-blur-xl p-4 space-y-3 md:hidden animate-in slide-in-from-top-2 duration-200 z-50 shadow-2xl">
          <nav className="space-y-1">
            <Link
              href="/studio"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname === '/studio' || pathname === '/'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Studio Soạn Thảo</span>
            </Link>

            <Link
              href="/lessons"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname.startsWith('/lessons')
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Thư Viện Bài Học</span>
            </Link>

            <Link
              href="/settings"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname === '/settings'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Cấu Hình & Presets</span>
            </Link>

            <Link
              href="/login"
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                pathname === '/login'
                  ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <User className="w-4 h-4 text-indigo-400" />
              <span>Đăng Nhập / Tài Khoản</span>
            </Link>
          </nav>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center space-x-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gateway:</span>
              <strong className={gatewayStatus === 'online' ? 'text-emerald-400' : 'text-rose-400'}>
                {gatewayStatus === 'online' ? 'Online (:8000)' : 'Offline'}
              </strong>
            </span>
          </div>
        </div>
      )}
    </header>
  );
}
