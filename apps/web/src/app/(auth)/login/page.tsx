'use client';

// User Login Page
// English comments only per project rules

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Sparkles, Mail, Lock, LogIn, UserCheck, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.login({ email, password });
      const token = res.data?.accessToken || (res.data as any)?.tokens?.access_token;
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('msl_access_token', token);
        }
        router.push('/studio');
      } else {
        setErrorMessage('Đăng nhập không thành công. Vui lòng kiểm tra lại tài khoản.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ đăng nhập.';
      setErrorMessage(msg.includes('401') ? 'Email hoặc mật khẩu không chính xác.' : msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.auth.guest();
      const token = res.data?.accessToken || (res.data as any)?.tokens?.access_token;
      if (token) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('msl_access_token', token);
        }
        router.push('/studio');
      }
    } catch {
      // Fallback guest session
      if (typeof window !== 'undefined') {
        localStorage.setItem('msl_access_token', 'guest_local_token');
      }
      router.push('/studio');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 rounded-3xl glass-panel border border-slate-800/80 shadow-2xl space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 mx-auto">
          <span className="text-2xl">🐱</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Chào Mừng Trở Lại
        </h1>
        <p className="text-xs text-slate-400">
          Đăng nhập để đồng bộ bài học và tiến độ Shadowing của bạn
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold animate-in fade-in">
          {errorMessage}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Địa chỉ Email:</label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@meowshadow.lab"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Mật khẩu:</label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang xác thực...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Đăng Nhập</span>
            </>
          )}
        </button>
      </form>

      {/* Guest Mode Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-800 w-full" />
        <span className="bg-slate-950 px-3 text-[11px] text-slate-500 uppercase tracking-wider relative">
          Hoặc
        </span>
      </div>

      {/* Guest Action */}
      <button
        type="button"
        onClick={handleGuestLogin}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
      >
        <UserCheck className="w-4 h-4 text-emerald-400" />
        <span>Trải Nghiệm Dưới Tư Cách Khách (Guest)</span>
      </button>

      {/* Footer Link */}
      <div className="text-center text-xs text-slate-400 pt-2">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">
          Đăng ký ngay
        </Link>
      </div>
    </div>
  );
}
