// Offline Store - Zustand state management for downloaded lessons and synchronization status
// English comments only per project rules

import { create } from "zustand";
import { sqliteDb, LocalLessonRecord } from "../db/sqlite";
import { offlineManager, LessonDownloadRequest } from "../services/offlineManager";

interface OfflineState {
  lessons: LocalLessonRecord[];
  isLoading: boolean;
  isSyncing: boolean;
  totalStorageMb: number;

  // Actions
  fetchOfflineLessons: () => Promise<void>;
  downloadLesson: (request: LessonDownloadRequest) => Promise<void>;
  deleteOfflineLesson: (id: string) => Promise<void>;
  syncProgress: () => Promise<number>;
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  lessons: [],
  isLoading: false,
  isSyncing: false,
  totalStorageMb: 0,

  fetchOfflineLessons: async () => {
    set({ isLoading: true });
    try {
      const allLessons = await sqliteDb.getAllLessons();
      // Calculate estimated file size: ~1.4 MB per minute of 192kbps audio
      const totalMb = allLessons.reduce((acc, l) => acc + (l.duration_sec / 60) * 1.4, 0);
      set({
        lessons: allLessons,
        totalStorageMb: parseFloat(totalMb.toFixed(1)),
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
    }
  },

  downloadLesson: async (request: LessonDownloadRequest) => {
    set({ isLoading: true });
    try {
      await offlineManager.downloadLessonForOffline(request);
      await get().fetchOfflineLessons();
    } finally {
      set({ isLoading: false });
    }
  },

  deleteOfflineLesson: async (id: string) => {
    await offlineManager.removeLessonFromDevice(id);
    await get().fetchOfflineLessons();
  },

  syncProgress: async () => {
    set({ isSyncing: true });
    try {
      const result = await offlineManager.syncOfflineProgress();
      await get().fetchOfflineLessons();
      return result.syncedRecordsCount;
    } finally {
      set({ isSyncing: false });
    }
  },
}));
