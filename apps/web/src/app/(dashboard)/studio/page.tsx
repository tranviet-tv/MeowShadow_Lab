'use client';

import React from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { Sparkles, Sliders, Volume2, Wand2, FileCode, Play, Layers } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

import { AIActionBar } from '@/components/studio/AIActionBar';
import { ScriptEditor } from '@/components/studio/ScriptEditor';
import { WordCounter } from '@/components/studio/WordCounter';
import { PacingController } from '@/components/studio/PacingController';
import { VoiceSelector } from '@/components/studio/VoiceSelector';

export default function StudioPage() {
  const {
    title,
    setTitle,
    targetLanguage,
    setTargetLanguage,
  } = useStudioStore();

  return (
    <div className="space-y-6 pb-12">
      {/* Studio Top Control Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl glass-panel shadow-glass">
        <div className="flex-1 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MeowShadow Studio v3.2</span>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent text-xl md:text-2xl font-bold text-white border-none focus:outline-none focus:ring-1 focus:ring-indigo-500/50 rounded px-1 -ml-1 placeholder:text-slate-500"
            placeholder="Nhập tiêu đề bài học Shadowing..."
          />
        </div>

        {/* Target Language Toggle */}
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 px-2 font-medium">Ngoại ngữ:</span>
          {SUPPORTED_LANGUAGES.filter((l) => l.id !== 'vi').map((lang) => (
            <button
              key={lang.id}
              onClick={() => setTargetLanguage(lang.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                targetLanguage === lang.id
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Studio Work Area - 2 Columns (Editor left, Pacing right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Script Editor & AI Action (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6" id="studio-editor-container">
          {/* AI Auto-Translate & Chunk Bar */}
          <AIActionBar />

          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Trình Soạn Thảo Kịch Bản Song Ngữ</span>
            </h2>
            <ScriptEditor />
          </div>

          {/* Word Counter & Duration Estimation */}
          <WordCounter />
        </div>

        {/* Right Column: Pacing Controller & Voice Selection (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6" id="studio-controls-container">
          {/* Voice Selection */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Lựa Chọn Giọng Đọc (Voice Selector)</span>
            </h2>
            <VoiceSelector />
          </div>

          {/* Pacing Controller */}
          <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Bảng Điều Khiển Pacing & Nhịp Điệu</span>
            </h2>
            <PacingController />
          </div>
        </div>
      </div>
    </div>
  );
}
