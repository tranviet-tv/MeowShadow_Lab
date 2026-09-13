'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { SubtitleLine } from './SubtitleLine';
import { PlaybackBar } from './PlaybackBar';
import { WaveformVisualizer } from './WaveformVisualizer';
import { Headphones, Sparkles, BookOpen } from 'lucide-react';

export function KaraokePlayer() {
  const {
    lesson,
    subtitles,
    audioUrl,
    isPlaying,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    seekTarget,
    clearSeekTarget,
    playbackRate,
    volume,
    isMuted,
    activeSubtitleId,
    autoScroll,
    seek,
  } = usePlayerStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync isPlaying state with audio element
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {
        // Autoplay may be blocked by browser policy until user gesture
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Handle seekTarget changes from store
  useEffect(() => {
    if (seekTarget !== null && audioRef.current) {
      audioRef.current.currentTime = seekTarget;
      clearSeekTarget();
    }
  }, [seekTarget, clearSeekTarget]);

  // Sync playback rate
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Sync volume and mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Audio element event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Hidden HTML5 Audio Element */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          preload="metadata"
        />
      )}

      {/* Top Lesson Title & Meta Info */}
      <div className="p-5 rounded-2xl glass-panel border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Karaoke Shadowing Player</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {lesson?.title || 'Bài Học Shadowing Song Ngữ'}
          </h1>
          <p className="text-xs text-slate-400">
            Ngôn ngữ: Tiếng Việt $\leftrightarrow$ {lesson?.targetLanguage?.toUpperCase() || 'EN'} •{' '}
            {subtitles.length} phân đoạn câu thoại
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center space-x-1.5">
            <Headphones className="w-3.5 h-3.5" />
            <span>Auto-Sync Active</span>
          </span>
        </div>
      </div>

      {/* Waveform Visualizer */}
      <WaveformVisualizer lessonId={lesson?.id} />

      {/* Subtitles Stream Container (Auto-scroll target) */}
      <div className="space-y-3 min-h-[350px] max-h-[550px] overflow-y-auto pr-2 rounded-2xl p-2 bg-slate-950/40 border border-slate-800/50">
        {subtitles.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-sm italic">
            Chưa có dữ liệu phụ đề cho bài học này.
          </div>
        ) : (
          subtitles.map((sub) => (
            <SubtitleLine
              key={sub.id}
              subtitle={sub}
              isActive={activeSubtitleId === sub.id}
              autoScroll={autoScroll}
              onSeek={seek}
            />
          ))
        )}
      </div>

      {/* Sticky Bottom Playback Controller */}
      <PlaybackBar />
    </div>
  );
}
