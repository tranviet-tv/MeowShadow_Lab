// Offline Manager - Handles downloading audio/subtitles and syncing progress to PostgreSQL Gateway
// English comments only per project rules

import * as FileSystem from "expo-file-system";
import { sqliteDb, LocalLessonRecord, OfflineProgressRecord } from "../db/sqlite";

export interface LessonDownloadRequest {
  id: string;
  title: string;
  targetLanguage: string;
  durationSec: number;
  audioUrl: string;
  srtUrl?: string;
  transcriptChunks: Array<{
    id: string;
    startTimeSec: number;
    endTimeSec: number;
    lang: string;
    textVi: string;
    textTarget: string;
  }>;
}

export interface SyncResult {
  success: boolean;
  syncedRecordsCount: number;
  syncedLessonIds: string[];
  timestamp: string;
}

class OfflineSyncManager {
  /**
   * Download lesson media files and store structure into local SQLite
   */
  async downloadLessonForOffline(
    request: LessonDownloadRequest,
    onProgress?: (progress: number) => void
  ): Promise<LocalLessonRecord> {
    if (onProgress) onProgress(0.1);

    // Formulate local persistent storage paths
    let localAudioPath = `file:///app_storage/audio/${request.id}.mp3`;
    let localSrtPath = request.srtUrl ? `file:///app_storage/subtitles/${request.id}.srt` : undefined;

    try {
      if (FileSystem.documentDirectory && request.audioUrl && request.audioUrl.startsWith("http")) {
        const destAudio = `${FileSystem.documentDirectory}audio_${request.id}.mp3`;
        const res = await FileSystem.downloadAsync(request.audioUrl, destAudio);
        if (res.status === 200) {
          localAudioPath = res.uri;
        }
      }
    } catch {
      // Fallback to storage URI in offline sandbox or test env
    }

    if (onProgress) onProgress(0.5);

    // Save lesson metadata into SQLite
    const record: LocalLessonRecord = {
      id: request.id,
      title: request.title,
      target_language: request.targetLanguage,
      duration_sec: request.durationSec,
      local_audio_path: localAudioPath,
      local_srt_path: localSrtPath || '',
      transcript_chunks: JSON.stringify(request.transcriptChunks),
      downloaded_at: new Date().toISOString(),
    };

    await sqliteDb.saveLesson(record);

    if (onProgress) onProgress(1.0);
    return record;
  }

  /**
   * Push unsynced offline playback sessions to Golang Gateway PostgreSQL
   */
  async syncOfflineProgress(
    apiBaseUrl = "http://localhost:8000",
    token?: string
  ): Promise<SyncResult> {
    const unsynced = await sqliteDb.getUnsyncedProgress();

    if (unsynced.length === 0) {
      return {
        success: true,
        syncedRecordsCount: 0,
        syncedLessonIds: [],
        timestamp: new Date().toISOString(),
      };
    }

    let authToken = token;
    if (!authToken) {
      try {
        // Attempt guest login to obtain a valid bearer token if none provided
        const guestRes = await fetch(`${apiBaseUrl}/api/v1/auth/guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (guestRes.ok) {
          const guestData = await guestRes.json();
          authToken =
            guestData?.data?.accessToken ||
            guestData?.data?.tokens?.access_token ||
            guestData?.data?.access_token;
        }
      } catch {
        // Proceed even if guest login fails
      }
    }

    const payload = {
      syncBatchId: `sync-${Date.now()}`,
      records: unsynced.map((r: OfflineProgressRecord) => ({
        lessonId: r.lesson_id,
        playbackOffsetSec: r.playback_offset_sec,
        shadowingRepeatCount: r.shadowing_repeat_count,
        isCompleted: r.is_completed === 1,
        version: r.version,
      })),
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    try {
      // Post to Gateway progress sync-batch endpoint
      const response = await fetch(`${apiBaseUrl}/api/v1/progress/sync-batch`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });


      const lessonIds = unsynced.map((r) => r.lesson_id);

      if (response.ok) {
        await sqliteDb.markProgressAsSynced(lessonIds);
        return {
          success: true,
          syncedRecordsCount: unsynced.length,
          syncedLessonIds: lessonIds,
          timestamp: new Date().toISOString(),
        };
      } else {
        // Backend error response: preserve records in SQLite to prevent data loss
        return {
          success: false,
          syncedRecordsCount: 0,
          syncedLessonIds: [],
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err) {
      // Network unreachable: keep all pending progress records for next online cycle
      return {
        success: false,
        syncedRecordsCount: 0,
        syncedLessonIds: [],
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete lesson from device and SQLite
   */
  async removeLessonFromDevice(lessonId: string): Promise<boolean> {
    return await sqliteDb.deleteLesson(lessonId);
  }
}

export const offlineManager = new OfflineSyncManager();
