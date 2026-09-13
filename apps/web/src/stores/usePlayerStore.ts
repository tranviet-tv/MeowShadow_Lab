import { create } from 'zustand';
import type { LessonItem, SubtitleTimestamp } from '@meowshadow/types';

interface PlayerState {
  lesson: LessonItem | null;
  subtitles: SubtitleTimestamp[];
  audioUrl: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  activeSubtitleId: number | null;
  repeatCount: number;
  autoScroll: boolean;
  seekTarget: number | null; // Trigger for audio element to seek

  // Actions
  setLesson: (lesson: LessonItem) => void;
  setSubtitles: (subtitles: SubtitleTimestamp[]) => void;
  setAudioUrl: (audioUrl: string) => void;
  setCurrentTime: (currentTime: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (playbackRate: number) => void;
  setActiveSubtitleId: (id: number | null) => void;
  incrementRepeatCount: () => void;
  toggleAutoScroll: () => void;
  seek: (time: number) => void;
  clearSeekTarget: () => void;
  repeatCurrentChunk: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  lesson: null,
  subtitles: [],
  audioUrl: null,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  volume: 0.9,
  isMuted: false,
  playbackRate: 1.0,
  activeSubtitleId: null,
  repeatCount: 0,
  autoScroll: true,
  seekTarget: null,

  setLesson: (lesson) =>
    set({
      lesson,
      duration: lesson.durationSec || 0,
    }),

  setSubtitles: (subtitles) => set({ subtitles }),

  setAudioUrl: (audioUrl) => set({ audioUrl }),

  setCurrentTime: (currentTime) => {
    const { subtitles, activeSubtitleId } = get();
    // Find active subtitle matching currentTime
    const currentSub = subtitles.find(
      (s) => currentTime >= s.startTimeSec && currentTime <= s.endTimeSec
    );

    const newActiveId = currentSub ? currentSub.id : null;
    if (newActiveId !== activeSubtitleId) {
      set({ currentTime, activeSubtitleId: newActiveId });
    } else {
      set({ currentTime });
    }
  },

  setDuration: (duration) => set({ duration }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), isMuted: false }),

  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

  setPlaybackRate: (playbackRate) => set({ playbackRate }),

  setActiveSubtitleId: (activeSubtitleId) => set({ activeSubtitleId }),

  incrementRepeatCount: () => set((state) => ({ repeatCount: state.repeatCount + 1 })),

  toggleAutoScroll: () => set((state) => ({ autoScroll: !state.autoScroll })),

  seek: (time) => {
    const { duration } = get();
    const clampedTime = Math.max(0, Math.min(duration || 9999, time));
    set({ seekTarget: clampedTime, currentTime: clampedTime });
  },

  clearSeekTarget: () => set({ seekTarget: null }),

  repeatCurrentChunk: () => {
    const { subtitles, currentTime, seek, incrementRepeatCount, setIsPlaying } = get();
    // Find current active subtitle, or find the closest preceding subtitle
    let targetSub = subtitles.find(
      (s) => currentTime >= s.startTimeSec && currentTime <= s.endTimeSec
    );

    if (!targetSub && subtitles.length > 0) {
      // Find the latest subtitle before current time
      const preceding = [...subtitles]
        .reverse()
        .find((s) => s.startTimeSec <= currentTime);
      targetSub = preceding || subtitles[0];
    }

    if (targetSub) {
      seek(targetSub.startTimeSec);
      setIsPlaying(true);
      incrementRepeatCount();
    }
  },
}));
