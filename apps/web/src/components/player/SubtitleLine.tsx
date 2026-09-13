'use client';

import React, { useEffect, useRef } from 'react';
import type { SubtitleTimestamp } from '@meowshadow/types';
import { formatTime } from '@/lib/utils';
import { Volume2, Play } from 'lucide-react';

interface SubtitleLineProps {
  subtitle: SubtitleTimestamp;
  isActive: boolean;
  autoScroll: boolean;
  onSeek: (time: number) => void;
}

export function SubtitleLine({
  subtitle,
  isActive,
  autoScroll,
  onSeek,
}: SubtitleLineProps) {
  const lineRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll active subtitle into center of view
  useEffect(() => {
    if (isActive && autoScroll && lineRef.current) {
      lineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [isActive, autoScroll]);

  const isVi = subtitle.lang === 'vi';
  const isJa = subtitle.lang === 'ja';

  return (
    <div
      ref={lineRef}
      onClick={() => onSeek(subtitle.startTimeSec)}
      className={`p-4 rounded-2xl border transition-all duration-300 cursor-pointer group flex items-start justify-between gap-4 ${
        isActive
          ? 'bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border-indigo-500/80 shadow-glow scale-[1.01]'
          : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700/90 hover:bg-slate-900/60'
      }`}
    >
      <div className="space-y-1.5 flex-1">
        {/* Top meta tags */}
        <div className="flex items-center space-x-2">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
              isVi
                ? 'tag-vi'
                : isJa
                ? 'tag-ja'
                : 'tag-en'
            }`}
          >
            [{subtitle.lang.toUpperCase()}]
          </span>

          <span className="text-[11px] font-mono text-slate-500">
            {formatTime(subtitle.startTimeSec)} - {formatTime(subtitle.endTimeSec)}
          </span>

          {isActive && (
            <span className="flex items-center space-x-1 text-[10px] font-semibold text-indigo-400 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span>Đang phát</span>
            </span>
          )}
        </div>

        {/* Subtitle text */}
        <p
          className={`text-sm sm:text-base leading-relaxed transition-colors ${
            isActive
              ? 'text-white font-semibold'
              : 'text-slate-300 group-hover:text-white font-normal'
          }`}
        >
          {subtitle.text}
        </p>
      </div>

      {/* Right Action Button */}
      <div className="flex-shrink-0 pt-1">
        {isActive ? (
          <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-900 text-slate-500 group-hover:text-slate-300 group-hover:bg-slate-800 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-3.5 h-3.5 ml-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}
