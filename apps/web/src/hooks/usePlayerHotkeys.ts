'use client';

import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';

export interface HotkeyDefinition {
  key: string;
  description: string;
  actionName: string;
}

export const HOTKEYS_LIST: HotkeyDefinition[] = [
  { key: 'K', description: 'Tạm dừng / Tiếp tục phát', actionName: 'Play/Pause' },
  { key: 'R', description: 'Tua về đầu câu & lặp lại để nhại giọng', actionName: 'Repeat Chunk' },
  { key: 'J', description: 'Tua lùi 5 giây', actionName: 'Rewind 5s' },
  { key: 'L', description: 'Tua tới 5 giây', actionName: 'Forward 5s' },
  { key: 'M', description: 'Bật / Tắt âm lượng', actionName: 'Toggle Mute' },
  { key: '↑ / ↓', description: 'Tăng / Giảm âm lượng', actionName: 'Volume' },
];

/**
 * Global keyboard shortcuts hook for the interactive Karaoke Player.
 */
export function usePlayerHotkeys(enabled: boolean = true) {
  const {
    currentTime,
    togglePlay,
    seek,
    repeatCurrentChunk,
    volume,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore hotkeys when typing in input, textarea, or editable elements
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      switch (e.code) {
        case 'KeyK':
        case 'Space': {
          e.preventDefault();
          togglePlay();
          break;
        }

        case 'KeyR': {
          e.preventDefault();
          repeatCurrentChunk();
          break;
        }

        case 'KeyJ': {
          e.preventDefault();
          const current = usePlayerStore.getState().currentTime;
          seek(current - 5);
          break;
        }

        case 'KeyL': {
          e.preventDefault();
          const current = usePlayerStore.getState().currentTime;
          seek(current + 5);
          break;
        }

        case 'KeyM': {
          e.preventDefault();
          toggleMute();
          break;
        }

        case 'ArrowUp': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          setVolume(currentVol + 0.1);
          break;
        }

        case 'ArrowDown': {
          e.preventDefault();
          const currentVol = usePlayerStore.getState().volume;
          setVolume(currentVol - 0.1);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    togglePlay,
    seek,
    repeatCurrentChunk,
    setVolume,
    toggleMute,
  ]);

  return { hotkeys: HOTKEYS_LIST };
}
