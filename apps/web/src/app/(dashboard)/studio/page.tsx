'use client';

import React from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { Sparkles, Sliders, Volume2, Wand2, FileCode, Play, Layers } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants';

import { useState } from 'react';
import { api } from '@/lib/api';
import { parseTaggedScript, countWords, estimateAudioDuration } from '@/lib/utils';
import { AIActionBar } from '@/components/studio/AIActionBar';
import { ScriptEditor } from '@/components/studio/ScriptEditor';
import { WordCounter } from '@/components/studio/WordCounter';
import { PacingController } from '@/components/studio/PacingController';
import { VoiceSelector } from '@/components/studio/VoiceSelector';
import { RenderProgressModal } from '@/components/studio/RenderProgressModal';

export default function StudioPage() {
  const {
    title,
    setTitle,
    targetLanguage,
    setTargetLanguage,
    scriptContent,
    pacingConfig,
  } = useStudioStore();

  const [isRenderModalOpen, setIsRenderModalOpen] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [createdLessonId, setCreatedLessonId] = useState<string>('sample-1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartRender = async () => {
    const { chunks, pairs } = parseTaggedScript(scriptContent, targetLanguage);
    if (pairs.length === 0) {
      setErrorMessage('Vui lòng nhập ít nhất một cặp câu song ngữ trước khi tạo bài học.');
      setTimeout(() => setErrorMessage(null), 3500);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const words = countWords(scriptContent);
    const estDuration = estimateAudioDuration(words, pairs.length * 5);

    try {

      // 1. Create lesson in Gateway PostgreSQL
      const createRes = await api.lessons.create({
        title: title.trim() || 'Bài học Shadowing mới',
        targetLanguage,
        pacingConfig,
        transcriptChunks: chunks,
        totalWords: words,
        durationSec: estDuration,
      });

      const lessonId = createRes.data?.id;
      if (!lessonId) {
        throw new Error('Máy chủ không trả về mã định danh bài học hợp lệ.');
      }
      setCreatedLessonId(lessonId);

      // 2. Dispatch audio generation job
      const isKokoro =
        pacingConfig.targetVoice?.startsWith('kokoro-') ||
        pacingConfig.viVoice?.startsWith('kokoro-');

      const audioRes = await api.audio.generate({
        lessonId,
        title: title.trim() || 'Bài học Shadowing mới',
        targetLanguage,
        sourceText: scriptContent,
        ttsEngine: isKokoro ? 'kokoro' : 'edge-tts',
        pacingConfig,
        transcriptChunks: chunks,
      });

      const taskId =
        audioRes.data?.taskId ||
        (audioRes.data as any)?.task_id ||
        (audioRes as any)?.taskId ||
        (audioRes as any)?.task_id ||
        `task-${lessonId}`;
      setCurrentTaskId(taskId);
      setIsRenderModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to create lesson or dispatch audio generation:', err);
      const errMsg = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ backend';
      setErrorMessage(`Lỗi tạo bài học: ${errMsg}. Vui lòng kiểm tra kết nối hệ thống.`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

        {/* Action Controls: Language Toggle & Generate Audio Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Target Language Toggle */}
          <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
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

          {/* Primary Action: Synthesize Lesson Audio */}
          <button
            type="button"
            onClick={handleStartRender}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/25 transition-all flex items-center space-x-2 hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Tạo Audio Bài Học</span>
          </button>
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

      {/* Error banner if validation or submission failed */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Render Progress WebSocket Modal */}
      <RenderProgressModal
        isOpen={isRenderModalOpen}
        taskId={currentTaskId}
        targetLessonId={createdLessonId}
        onClose={() => setIsRenderModalOpen(false)}
      />
    </div>
  );
}
