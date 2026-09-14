'use client';

import React, { useEffect, useState, use } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { KaraokePlayer } from '@/components/player/KaraokePlayer';
import type { LessonItem, SubtitleTimestamp } from '@meowshadow/types';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

const SAMPLE_ENGLISH_SUBTITLES: SubtitleTimestamp[] = [
  {
    id: 1,
    startTimeSec: 0.0,
    endTimeSec: 3.5,
    lang: 'vi',
    text: 'Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ.',
  },
  {
    id: 2,
    startTimeSec: 5.0,
    endTimeSec: 9.0,
    lang: 'en',
    text: 'Today is a wonderful day to start learning a new language.',
  },
  {
    id: 3,
    startTimeSec: 12.5,
    endTimeSec: 18.0,
    lang: 'vi',
    text: 'Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày, khả năng phát âm sẽ tiến bộ vượt bậc.',
  },
  {
    id: 4,
    startTimeSec: 19.5,
    endTimeSec: 25.5,
    lang: 'en',
    text: 'When you consistently practice the shadowing technique every day, your pronunciation will improve dramatically.',
  },
  {
    id: 5,
    startTimeSec: 29.0,
    endTimeSec: 34.0,
    lang: 'vi',
    text: 'Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.',
  },
  {
    id: 6,
    startTimeSec: 35.5,
    endTimeSec: 41.0,
    lang: 'en',
    text: 'Listen carefully to each intonation and repeat immediately after the sentence finishes.',
  },
];

const SAMPLE_JAPANESE_SUBTITLES: SubtitleTimestamp[] = [
  {
    id: 1,
    startTimeSec: 0.0,
    endTimeSec: 3.5,
    lang: 'vi',
    text: 'Chào buổi sáng, hôm nay thời tiết tại Tokyo thật đẹp.',
  },
  {
    id: 2,
    startTimeSec: 5.0,
    endTimeSec: 9.0,
    lang: 'ja',
    text: 'おはようございます、今日の東京はとても良い天気ですね。',
  },
  {
    id: 3,
    startTimeSec: 12.5,
    endTimeSec: 17.0,
    lang: 'vi',
    text: 'Luyện tập Shadowing mỗi ngày giúp phát âm tự nhiên như người bản xứ.',
  },
  {
    id: 4,
    startTimeSec: 18.5,
    endTimeSec: 24.5,
    lang: 'ja',
    text: '毎日のシャドーイング練習は、ネイティブのような自然な発音につながります。',
  },
];

export default function LessonDetailPage({ params }: LessonPageProps) {
  const resolvedParams = use(params);
  const lessonId = resolvedParams.id;

  const { setLesson, setSubtitles, setAudioUrl } = usePlayerStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadLessonData() {
      setIsLoading(true);

      try {
        // 1. Fetch lesson details from Gateway Core
        const lessonRes = await api.lessons.get(lessonId);
        if (lessonRes.data && isMounted) {
          setLesson(lessonRes.data);

          // 2. Fetch subtitle timestamps
          try {
            const subRes = await api.lessons.getSubtitles(lessonId);
            if (subRes.data?.subtitles && subRes.data.subtitles.length > 0) {
              setSubtitles(subRes.data.subtitles);
            }
          } catch {
            // If subtitles endpoint not ready, synthesize from transcript chunks if available
            if (lessonRes.data.transcriptChunks && lessonRes.data.transcriptChunks.length > 0) {
              const generatedSubs: SubtitleTimestamp[] = lessonRes.data.transcriptChunks.map(
                (c, idx) => ({
                  id: idx + 1,
                  startTimeSec: idx * 6.0,
                  endTimeSec: idx * 6.0 + 4.5,
                  lang: c.lang,
                  text: c.text,
                })
              );
              setSubtitles(generatedSubs);
            }
          }

          setAudioUrl(`/api/v1/audio/stream/${lessonId}`);
          setIsLoading(false);
          return;
        }
      } catch {
        // Fallback for offline or demo lessons
      }

      // Fallback: check localStorage for locally created offline lesson first
      if (isMounted) {
        if (typeof window !== 'undefined') {
          try {
            const cachedRaw = localStorage.getItem(`msl_lesson_${lessonId}`);
            if (cachedRaw) {
              const cachedLesson = JSON.parse(cachedRaw) as LessonItem;
              if (
                cachedLesson &&
                cachedLesson.transcriptChunks &&
                cachedLesson.transcriptChunks.length > 0
              ) {
                const generatedSubs: SubtitleTimestamp[] = cachedLesson.transcriptChunks.map(
                  (c, idx) => ({
                    id: idx + 1,
                    startTimeSec: idx * 6.0,
                    endTimeSec: idx * 6.0 + 4.5,
                    lang: c.lang,
                    text: c.text,
                  })
                );
                setLesson(cachedLesson);
                setSubtitles(generatedSubs);
                setAudioUrl(cachedLesson.audioUrl || `/api/v1/audio/stream/${lessonId}`);
                setIsLoading(false);
                return;
              }
            }
          } catch {
            // Ignore parse errors and continue to sample lesson
          }
        }

        const isJapanese =
          lessonId.includes('japan') || lessonId.includes('ja') || lessonId === 'lesson-japanese-shadowing-3';

        const sampleLesson: LessonItem = {
          id: lessonId,
          title: isJapanese
            ? 'Tiếng Nhật Giao Tiếp Cơ Bản - Cuộc Sống Tại Tokyo (日本語)'
            : 'Bài Học Shadowing - Tự Tin Giao Tiếp Chuẩn Ngữ Điệu',
          targetLanguage: isJapanese ? 'ja' : 'en',
          sourceLanguage: 'vi',
          totalWords: isJapanese ? 64 : 58,
          durationSec: isJapanese ? 45 : 42,
          audioUrl: `/api/v1/audio/stream/${lessonId}`,
          srtUrl: `/api/v1/lessons/${lessonId}/export?format=srt`,
          createdAt: new Date().toISOString(),
          pacingConfig: {
            viVoice: 'vi-VN-HoaiMyNeural',
            targetVoice: isJapanese ? 'ja-JP-NanamiNeural' : 'en-US-JennyNeural',
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
        };

        setLesson(sampleLesson);
        setSubtitles(isJapanese ? SAMPLE_JAPANESE_SUBTITLES : SAMPLE_ENGLISH_SUBTITLES);
        setAudioUrl(`/api/v1/audio/stream/${lessonId}`);
        setIsLoading(false);
      }
    }

    loadLessonData();

    return () => {
      isMounted = false;
    };
  }, [lessonId, setLesson, setSubtitles, setAudioUrl]);

  return (
    <div className="space-y-4">
      {/* Navigation Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
        <Link
          href="/lessons"
          className="inline-flex items-center space-x-1.5 hover:text-indigo-300 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Thư viện bài học</span>
        </Link>
        <span className="text-slate-600">|</span>
        <Link
          href="/studio"
          className="inline-flex items-center space-x-1 hover:text-indigo-300 transition-colors py-1 px-2 rounded-lg hover:bg-slate-900 text-[11px]"
        >
          <span>Về Studio soạn thảo</span>
        </Link>
      </div>

      <KaraokePlayer />
    </div>
  );
}
