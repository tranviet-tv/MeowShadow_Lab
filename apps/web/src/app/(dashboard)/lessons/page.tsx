'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Headphones,
  Clock,
  Type,
  Sparkles,
  Plus,
  Search,
  Download,
  Filter,
  ArrowRight,
} from 'lucide-react';
import type { LessonItem, SupportedLanguage } from '@meowshadow/types';
import { ExportModal } from '@/components/player/ExportModal';
import { formatDuration } from '@/lib/utils';

const SAMPLE_LESSONS: LessonItem[] = [
  {
    id: 'lesson-daily-convo-1',
    title: 'Giao Tiếp Hằng Ngày - Chào Hỏi & Giới Thiệu Bản Thân',
    targetLanguage: 'en',
    sourceLanguage: 'vi',
    totalWords: 72,
    durationSec: 54,
    audioUrl: '/api/v1/audio/stream/lesson-daily-convo-1',
    srtUrl: '/api/v1/lessons/lesson-daily-convo-1/export?format=srt',
    createdAt: '2026-09-12T08:30:00Z',
    pacingConfig: {
      viVoice: 'vi-VN-HoaiMyNeural',
      targetVoice: 'en-US-JennyNeural',
      viSpeed: 1.0,
      targetSpeed: 1.0,
      silenceAfterViSec: 1.5,
      silenceAfterTargetSec: 3.5,
      silenceBetweenSentencesSec: 0.5,
      insertCueSound: true,
      exportFormat: 'mp3',
      audioBitrate: '192k',
    },
    transcriptChunks: [],
  },
  {
    id: 'lesson-shadowing-tech-2',
    title: 'Công Nghệ & Trí Tuệ Nhân Tạo Trong Đời Sống',
    targetLanguage: 'en',
    sourceLanguage: 'vi',
    totalWords: 95,
    durationSec: 72,
    audioUrl: '/api/v1/audio/stream/lesson-shadowing-tech-2',
    srtUrl: '/api/v1/lessons/lesson-shadowing-tech-2/export?format=srt',
    createdAt: '2026-09-12T14:15:00Z',
    pacingConfig: {
      viVoice: 'vi-VN-NamMinhNeural',
      targetVoice: 'en-US-GuyNeural',
      viSpeed: 1.0,
      targetSpeed: 1.0,
      silenceAfterViSec: 1.5,
      silenceAfterTargetSec: 3.5,
      silenceBetweenSentencesSec: 0.5,
      insertCueSound: true,
      exportFormat: 'mp3',
      audioBitrate: '192k',
    },
    transcriptChunks: [],
  },
  {
    id: 'lesson-japanese-shadowing-3',
    title: 'Tiếng Nhật Giao Tiếp Cơ Bản - Cuộc Sống Tại Tokyo (日本語)',
    targetLanguage: 'ja',
    sourceLanguage: 'vi',
    totalWords: 64,
    durationSec: 60,
    audioUrl: '/api/v1/audio/stream/lesson-japanese-shadowing-3',
    srtUrl: '/api/v1/lessons/lesson-japanese-shadowing-3/export?format=srt',
    createdAt: '2026-09-13T09:00:00Z',
    pacingConfig: {
      viVoice: 'vi-VN-HoaiMyNeural',
      targetVoice: 'ja-JP-NanamiNeural',
      viSpeed: 1.0,
      targetSpeed: 1.0,
      silenceAfterViSec: 1.5,
      silenceAfterTargetSec: 3.5,
      silenceBetweenSentencesSec: 0.5,
      insertCueSound: true,
      exportFormat: 'mp3',
      audioBitrate: '192k',
    },
    transcriptChunks: [],
  },
];

export default function LessonsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLang, setSelectedLang] = useState<'all' | 'en' | 'ja'>('all');
  const [exportLesson, setExportLesson] = useState<LessonItem | null>(null);

  const filteredLessons = useMemo(() => {
    return SAMPLE_LESSONS.filter((lesson) => {
      const matchLang =
        selectedLang === 'all' || lesson.targetLanguage === selectedLang;
      const matchSearch =
        lesson.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLang && matchSearch;
    });
  }, [searchQuery, selectedLang]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl glass-panel border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Thư Viện Bài Học Shadowing</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Kho Bài Học & Luyện Phản Xạ Đa Ngữ
          </h1>
          <p className="text-xs text-slate-400">
            Chọn một bài học để bắt đầu luyện nhại giọng với Trình phát Karaoke tương tác
          </p>
        </div>

        <Link
          href="/studio"
          className="px-4 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 flex items-center space-x-2 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Bài Học Mới</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Language Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setSelectedLang('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất cả bài học ({SAMPLE_LESSONS.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'en'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇺🇸 Tiếng Anh
          </button>
          <button
            type="button"
            onClick={() => setSelectedLang('ja')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedLang === 'ja'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🇯🇵 Tiếng Nhật
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm bài học theo tiêu đề..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Lesson Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="p-5 rounded-2xl glass-panel border border-slate-800/80 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    lesson.targetLanguage === 'ja' ? 'tag-ja' : 'tag-en'
                  }`}
                >
                  {lesson.targetLanguage === 'ja' ? '🇯🇵 Tiếng Nhật' : '🇺🇸 Tiếng Anh'}
                </span>

                <span className="text-[11px] font-mono text-slate-500">
                  {formatDuration(lesson.durationSec)}
                </span>
              </div>

              <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-2">
                {lesson.title}
              </h3>

              <div className="flex items-center space-x-3 text-xs text-slate-400 pt-1">
                <span className="flex items-center space-x-1">
                  <Type className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{lesson.totalWords} từ</span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>1.5s / 3.5s Pacing</span>
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
              <button
                type="button"
                onClick={() => setExportLesson(lesson)}
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
                title="Tải gói tài liệu (MP3 / SRT / ZIP)"
              >
                <Download className="w-4 h-4" />
              </button>

              <Link
                href={`/lessons/${lesson.id}`}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 group-hover:bg-indigo-600 group-hover:text-white"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Luyện Karaoke</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Export Modal */}
      {exportLesson && (
        <ExportModal
          isOpen={!!exportLesson}
          lessonId={exportLesson.id}
          lessonTitle={exportLesson.title}
          onClose={() => setExportLesson(null)}
        />
      )}
    </div>
  );
}
