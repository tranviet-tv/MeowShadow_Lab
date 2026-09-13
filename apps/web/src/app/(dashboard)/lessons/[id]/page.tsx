'use client';

import React, { useEffect, use } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { KaraokePlayer } from '@/components/player/KaraokePlayer';
import type { LessonItem, SubtitleTimestamp } from '@meowshadow/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface LessonPageProps {
  params: Promise<{ id: string }>;
}

const SAMPLE_SUBTITLES: SubtitleTimestamp[] = [
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

export default function LessonDetailPage({ params }: LessonPageProps) {
  const resolvedParams = use(params);
  const lessonId = resolvedParams.id;

  const { setLesson, setSubtitles, setAudioUrl } = usePlayerStore();

  useEffect(() => {
    // Initialize lesson and subtitles
    const sampleLesson: LessonItem = {
      id: lessonId,
      title: 'Bài Học Shadowing - Tự Tin Giao Tiếp Chuẩn Ngữ Điệu',
      targetLanguage: 'en',
      sourceLanguage: 'vi',
      totalWords: 58,
      durationSec: 42,
      audioUrl: `/api/v1/audio/stream/${lessonId}`,
      srtUrl: `/api/v1/lessons/${lessonId}/export?format=srt`,
      createdAt: new Date().toISOString(),
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
    };

    setLesson(sampleLesson);
    setSubtitles(SAMPLE_SUBTITLES);
    setAudioUrl(`http://localhost:8000/api/v1/audio/stream/${lessonId}`);
  }, [lessonId, setLesson, setSubtitles, setAudioUrl]);

  return (
    <div className="space-y-4">
      {/* Back to library / studio */}
      <div className="flex items-center space-x-2">
        <Link
          href="/studio"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors py-1 px-2.5 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại Studio soạn thảo</span>
        </Link>
      </div>

      <KaraokePlayer />
    </div>
  );
}
