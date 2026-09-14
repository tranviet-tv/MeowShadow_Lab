import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: any;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-background text-foreground relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top back button */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/studio"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors py-1.5 px-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Studio</span>
        </Link>
      </div>

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}
