'use client';

import React from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { formatTime } from '@/lib/utils';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  Scroll,
  ArrowLeftRight,
} from 'lucide-react';

export function PlaybackBar() {
  const {
    currentTime,
    duration,
    isPlaying,
    togglePlay,
    seek,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    playbackRate,
    setPlaybackRate,
    repeatCurrentChunk,
    repeatCount,
    autoScroll,
    toggleAutoScroll,
  } = usePlayerStore();

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    seek(val);
  };

  const skipSeconds = (delta: number) => {
    seek(currentTime + delta);
  };

  const PLAYBACK_RATES = [0.75, 1.0, 1.25, 1.5];

  return (
    <div className="rounded-2xl glass-panel border border-slate-800/90 p-4 shadow-2xl backdrop-blur-xl space-y-3">
      {/* 1. Timeline Progress Scrubber */}
      <div className="space-y-1.5">
        <div className="relative group">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all"
          />
          <div
            className="absolute top-0 left-0 h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg pointer-events-none group-hover:h-2 transition-all"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-mono text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* 2. Control Buttons & Settings */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left: Secondary toggles (Auto-scroll & Repeat Count) */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={toggleAutoScroll}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
              autoScroll
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Bật/Tắt tự động cuộn trang theo câu đang đọc"
          >
            <Scroll className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cuộn theo nhạc</span>
          </button>

          {repeatCount > 0 && (
            <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold">
              Nhại {repeatCount} lần
            </span>
          )}
        </div>

        {/* Center: Main Playback Transport Controls */}
        <div className="flex items-center space-x-3">
          {/* Skip backward 5s (J) */}
          <button
            type="button"
            onClick={() => skipSeconds(-5)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center justify-center"
            title="Tua lùi 5 giây (Phím J)"
          >
            <span className="text-xs font-bold font-mono">-5s</span>
          </button>

          {/* Repeat Current Chunk (R) */}
          <button
            type="button"
            onClick={repeatCurrentChunk}
            className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center space-x-1.5"
            title="Lặp lại câu hiện tại để nhại giọng (Phím R)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Nhại lại (R)</span>
          </button>

          {/* Main Play / Pause Button (Space) */}
          <button
            type="button"
            onClick={togglePlay}
            className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 flex items-center justify-center transition-transform hover:scale-105"
            title={isPlaying ? 'Tạm dừng (Space)' : 'Phát bài học (Space)'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip forward 5s (L) */}
          <button
            type="button"
            onClick={() => skipSeconds(5)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors flex items-center justify-center"
            title="Tua tới 5 giây (Phím L)"
          >
            <span className="text-xs font-bold font-mono">+5s</span>
          </button>
        </div>

        {/* Right: Volume & Playback Rate */}
        <div className="flex items-center space-x-3">
          {/* Speed Rate selector */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs">
            <Gauge className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                  playbackRate === rate
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Volume Control */}
          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title={isMuted ? 'Bật âm lượng (M)' : 'Tắt tiếng (M)'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-indigo-500"
              title={`Âm lượng: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
