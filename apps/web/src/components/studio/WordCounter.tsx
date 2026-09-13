'use client';

import React, { useMemo } from 'react';
import { useStudioStore } from '@/stores/useStudioStore';
import { countWords, formatDuration, formatTime, parseTaggedScript } from '@/lib/utils';
import { Clock, Type, Hash, Mic, PauseCircle, Zap } from 'lucide-react';

export function WordCounter() {
  const { scriptContent, targetLanguage, pacingConfig } = useStudioStore();

  // Parse chunks and compute stats
  const { chunks, pairs } = useMemo(
    () => parseTaggedScript(scriptContent, targetLanguage),
    [scriptContent, targetLanguage]
  );

  const stats = useMemo(() => {
    let viWords = 0;
    let targetWords = 0;

    for (const chunk of chunks) {
      const words = countWords(chunk.text);
      if (chunk.lang === 'vi') {
        viWords += words;
      } else {
        targetWords += words;
      }
    }

    const totalWords = viWords + targetWords;

    // Speech time estimation based on speech speed rates
    // Standard rate is ~140 words per minute (2.33 words/sec)
    const viWps = (140 / 60) * (pacingConfig.viSpeed || 1.0);
    const targetWps = (140 / 60) * (pacingConfig.targetSpeed || 1.0);

    const viSpeechDuration = viWords > 0 ? viWords / viWps : 0;
    const targetSpeechDuration = targetWords > 0 ? targetWords / targetWps : 0;
    const totalSpeechDuration = viSpeechDuration + targetSpeechDuration;

    // Silence calculation based on pairs count and pacing config
    const pairsCount = pairs.length;
    const totalViSilence = pairsCount * pacingConfig.silenceAfterViSec;
    const totalTargetSilence = pairsCount * pacingConfig.silenceAfterTargetSec;
    const totalInterSentenceSilence =
      Math.max(0, pairsCount - 1) * pacingConfig.silenceBetweenSentencesSec;
    const totalSilenceDuration =
      totalViSilence + totalTargetSilence + totalInterSentenceSilence;

    const totalDurationSec = totalSpeechDuration + totalSilenceDuration;

    const speechPercent =
      totalDurationSec > 0
        ? Math.round((totalSpeechDuration / totalDurationSec) * 100)
        : 50;
    const silencePercent = 100 - speechPercent;

    return {
      totalWords,
      viWords,
      targetWords,
      chunksCount: chunks.length,
      pairsCount,
      totalSpeechDuration,
      totalSilenceDuration,
      totalDurationSec,
      speechPercent,
      silencePercent,
    };
  }, [chunks, pairs, pacingConfig]);

  return (
    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-3.5">
      {/* Top Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Type className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tổng số từ</span>
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            {stats.totalWords}{' '}
            <span className="text-xs font-normal text-slate-400">từ</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            VI: {stats.viWords} | {targetLanguage.toUpperCase()}: {stats.targetWords}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Hash className="w-3.5 h-3.5 text-sky-400" />
            <span>Cặp câu</span>
          </div>
          <div className="text-lg font-bold text-white tracking-tight">
            {stats.pairsCount}{' '}
            <span className="text-xs font-normal text-slate-400">cặp</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {stats.chunksCount} phân đoạn câu
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Thời lượng dự kiến</span>
          </div>
          <div className="text-lg font-bold text-amber-300 tracking-tight">
            {formatTime(stats.totalDurationSec)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            ~{formatDuration(stats.totalDurationSec)}
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="flex items-center space-x-1.5 text-slate-400 text-xs mb-1">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nhịp điệu Shadowing</span>
          </div>
          <div className="text-lg font-bold text-emerald-300 tracking-tight">
            1.5s / 3.5s
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Lặng VI / Lặng Ngoại ngữ
          </div>
        </div>
      </div>

      {/* Audio Timeline Ratio Bar */}
      <div className="space-y-1.5 pt-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center space-x-1.5">
            <Mic className="w-3 h-3 text-indigo-400" />
            <span>
              Phát âm: <strong className="text-slate-200">{formatTime(stats.totalSpeechDuration)}</strong> ({stats.speechPercent}%)
            </span>
          </span>
          <span className="flex items-center space-x-1.5">
            <PauseCircle className="w-3 h-3 text-amber-400" />
            <span>
              Khoảng lặng nhại giọng: <strong className="text-slate-200">{formatTime(stats.totalSilenceDuration)}</strong> ({stats.silencePercent}%)
            </span>
          </span>
        </div>

        {/* Dual Color Visual Progress Bar */}
        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
            style={{ width: `${stats.speechPercent}%` }}
            title={`Giọng đọc: ${stats.speechPercent}%`}
          />
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-600 transition-all duration-300"
            style={{ width: `${stats.silencePercent}%` }}
            title={`Khoảng lặng luyện tập: ${stats.silencePercent}%`}
          />
        </div>
      </div>
    </div>
  );
}
