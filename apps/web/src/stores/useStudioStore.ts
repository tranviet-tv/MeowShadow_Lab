import { create } from 'zustand';
import type { PacingConfig, SupportedLanguage } from '@meowshadow/types';
import {
  DEFAULT_PACING_CONFIG,
  PACING_PRESETS,
  SAMPLE_TAGGED_SCRIPT,
  type PacingPreset,
} from '@/lib/constants';

export type StudioViewMode = 'interleaved' | 'side-by-side';

interface StudioState {
  title: string;
  targetLanguage: SupportedLanguage;
  scriptContent: string;
  viewMode: StudioViewMode;
  pacingConfig: PacingConfig;
  activePresetId: string | null;
  rawInputText: string;
  isGenerating: boolean;
  activeTaskId: string | null;

  // Actions
  setTitle: (title: string) => void;
  setTargetLanguage: (lang: SupportedLanguage) => void;
  setScriptContent: (content: string) => void;
  setViewMode: (mode: StudioViewMode) => void;
  updatePacingConfig: (config: Partial<PacingConfig>) => void;
  applyPreset: (preset: PacingPreset) => void;
  setRawInputText: (text: string) => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setActiveTaskId: (taskId: string | null) => void;
  resetStudio: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  title: 'Bài học Shadowing - Giao tiếp hàng ngày',
  targetLanguage: 'en',
  scriptContent: SAMPLE_TAGGED_SCRIPT,
  viewMode: 'interleaved',
  pacingConfig: { ...DEFAULT_PACING_CONFIG },
  activePresetId: 'standard-shadowing',
  rawInputText: '',
  isGenerating: false,
  activeTaskId: null,

  setTitle: (title) => set({ title }),

  setTargetLanguage: (targetLanguage) =>
    set((state) => {
      // Auto switch target voice default if language changes
      const targetVoice =
        targetLanguage === 'ja' ? 'ja-JP-NanamiNeural' : 'en-US-JennyNeural';
      return {
        targetLanguage,
        pacingConfig: {
          ...state.pacingConfig,
          targetVoice,
        },
      };
    }),

  setScriptContent: (scriptContent) => set({ scriptContent }),

  setViewMode: (viewMode) => set({ viewMode }),

  updatePacingConfig: (partial) =>
    set((state) => ({
      pacingConfig: {
        ...state.pacingConfig,
        ...partial,
      },
      activePresetId: null, // Clear active preset when customized manually
    })),

  applyPreset: (preset) =>
    set((state) => ({
      pacingConfig: {
        ...state.pacingConfig,
        ...preset.config,
      },
      activePresetId: preset.id,
    })),

  setRawInputText: (rawInputText) => set({ rawInputText }),

  setIsGenerating: (isGenerating) => set({ isGenerating }),

  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),

  resetStudio: () =>
    set({
      title: 'Bài học Shadowing mới',
      targetLanguage: 'en',
      scriptContent: '',
      viewMode: 'interleaved',
      pacingConfig: { ...DEFAULT_PACING_CONFIG },
      activePresetId: 'standard-shadowing',
      rawInputText: '',
      isGenerating: false,
      activeTaskId: null,
    }),
}));
