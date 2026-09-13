// Player Store - Zustand state management for active audio session and shadowing repetitions
// English comments only per project rules

import { create } from "zustand";
import { audioService } from "../services/audioService";

export interface SubtitleChunk {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  lang: string;
  textVi: string;
  textTarget: string;
}

export interface CurrentLesson {
  id: string;
  title: string;
  targetLanguage: "en" | "ja" | "vi";
  audioUrl: string;
  durationSec: number;
}

interface PlayerState {
  currentLesson: CurrentLesson | null;
  subtitles: SubtitleChunk[];
  currentTimeSec: number;
  durationSec: number;
  isPlaying: boolean;
  activeSubtitleIndex: number;
  repeatCount: number;
  playbackRate: number;
  isBackgroundEnabled: boolean;

  // Actions
  loadLesson: (lesson: CurrentLesson, subtitles: SubtitleChunk[]) => Promise<void>;
  togglePlay: () => Promise<void>;
  seek: (offsetSec: number) => Promise<void>;
  seekTo: (targetSec: number) => Promise<void>;
  repeatCurrentChunk: () => Promise<void>;
  jumpToSubtitle: (index: number) => Promise<void>;
  setPlaybackRate: (rate: number) => Promise<void>;
  setBackgroundEnabled: (enabled: boolean) => void;
  syncFromNativeStatus: (positionSec: number, durationSec: number, isPlaying: boolean) => void;
}

const DEFAULT_SAMPLE_SUBTITLES: SubtitleChunk[] = [
  {
    id: "sub-1",
    startTimeSec: 0.0,
    endTimeSec: 4.2,
    lang: "en",
    textVi: "Chào buổi sáng mọi người, cảm ơn vì đã tham gia buổi họp đúng giờ.",
    textTarget: "Good morning everyone, thank you for joining the standup on time.",
  },
  {
    id: "sub-2",
    startTimeSec: 4.5,
    endTimeSec: 9.8,
    lang: "en",
    textVi: "Hôm nay chúng ta sẽ xem xét tiến độ của sprint và các vấn đề cần giải quyết.",
    textTarget: "Today we will review our sprint progress and discuss any blockers.",
  },
  {
    id: "sub-3",
    startTimeSec: 10.2,
    endTimeSec: 15.6,
    lang: "en",
    textVi: "Tính năng phát audio chạy nền trên điện thoại đã được kết nối xong.",
    textTarget: "The background audio playback service on mobile is fully wired up.",
  },
  {
    id: "sub-4",
    startTimeSec: 16.0,
    endTimeSec: 21.4,
    lang: "en",
    textVi: "Bạn có thể bấm nút Repeat để nhại lại câu thoại vừa nghe ngay lập tức.",
    textTarget: "You can hit the Repeat button to immediately shadow the current chunk.",
  },
];

const DEFAULT_SAMPLE_LESSON: CurrentLesson = {
  id: "lesson-en-001",
  title: "Morning Standup & Sprint Planning",
  targetLanguage: "en",
  audioUrl: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
  durationSec: 21.4,
};

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentLesson: DEFAULT_SAMPLE_LESSON,
  subtitles: DEFAULT_SAMPLE_SUBTITLES,
  currentTimeSec: 0,
  durationSec: DEFAULT_SAMPLE_LESSON.durationSec,
  isPlaying: false,
  activeSubtitleIndex: 0,
  repeatCount: 0,
  playbackRate: 1.0,
  isBackgroundEnabled: true,

  loadLesson: async (lesson: CurrentLesson, subtitles: SubtitleChunk[]) => {
    set({
      currentLesson: lesson,
      subtitles,
      durationSec: lesson.durationSec,
      currentTimeSec: 0,
      activeSubtitleIndex: 0,
      repeatCount: 0,
      isPlaying: false,
    });
    try {
      await audioService.loadAudio(lesson.audioUrl);
    } catch (err) {
      console.warn("Audio load deferred or offline fallback:", err);
    }
  },

  togglePlay: async () => {
    const { isPlaying } = get();
    set({ isPlaying: !isPlaying });
    await audioService.togglePlay();
  },

  seek: async (offsetSec: number) => {
    const { currentTimeSec, durationSec } = get();
    const nextTime = Math.max(0, Math.min(durationSec, currentTimeSec + offsetSec));
    set({ currentTimeSec: nextTime });
    await audioService.seekToMillis(nextTime * 1000);
  },

  seekTo: async (targetSec: number) => {
    const { durationSec } = get();
    const nextTime = Math.max(0, Math.min(durationSec, targetSec));
    set({ currentTimeSec: nextTime });
    await audioService.seekToMillis(nextTime * 1000);
  },

  repeatCurrentChunk: async () => {
    const { subtitles, activeSubtitleIndex, repeatCount } = get();
    const currentSub = subtitles[activeSubtitleIndex];
    if (currentSub) {
      set({
        currentTimeSec: currentSub.startTimeSec,
        repeatCount: repeatCount + 1,
        isPlaying: true,
      });
      await audioService.seekToMillis(currentSub.startTimeSec * 1000);
      await audioService.play();
    }
  },

  jumpToSubtitle: async (index: number) => {
    const { subtitles } = get();
    const sub = subtitles[index];
    if (sub) {
      set({
        activeSubtitleIndex: index,
        currentTimeSec: sub.startTimeSec,
        isPlaying: true,
      });
      await audioService.seekToMillis(sub.startTimeSec * 1000);
      await audioService.play();
    }
  },

  setPlaybackRate: async (rate: number) => {
    set({ playbackRate: rate });
    await audioService.setPlaybackRate(rate);
  },

  setBackgroundEnabled: (enabled: boolean) => {
    set({ isBackgroundEnabled: enabled });
  },

  syncFromNativeStatus: (positionSec: number, durationSec: number, isPlaying: boolean) => {
    const { subtitles } = get();
    let newActiveIndex = 0;
    for (let i = 0; i < subtitles.length; i++) {
      if (
        positionSec >= subtitles[i].startTimeSec &&
        positionSec <= subtitles[i].endTimeSec
      ) {
        newActiveIndex = i;
        break;
      }
    }

    set({
      currentTimeSec: positionSec,
      durationSec: durationSec > 0 ? durationSec : get().durationSec,
      isPlaying,
      activeSubtitleIndex: newActiveIndex,
    });
  },
}));
