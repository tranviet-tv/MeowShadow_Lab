// Local SQLite Database Storage Layer
// English comments only per project rules

import * as SQLite from "expo-sqlite";

export interface LocalLessonRecord {
  id: string;
  title: string;
  target_language: string;
  duration_sec: number;
  local_audio_path: string;
  local_srt_path: string;
  transcript_chunks: string; // JSON stringified dialogue chunks
  downloaded_at: string;
}

export interface OfflineProgressRecord {
  lesson_id: string;
  playback_offset_sec: number;
  shadowing_repeat_count: number;
  is_completed: number;
  version: number;
  updated_at: string;
  is_synced?: number;
}

/**
 * SQLite database manager using expo-sqlite with graceful fallback
 */
export class SQLiteDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private lessonsFallback: Map<string, LocalLessonRecord> = new Map();
  private progressFallback: Map<string, OfflineProgressRecord> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = SQLite.openDatabaseSync("meowshadow.db");
      this.db.execSync(`
        CREATE TABLE IF NOT EXISTS local_lessons (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          target_language TEXT NOT NULL,
          duration_sec REAL NOT NULL,
          local_audio_path TEXT NOT NULL,
          local_srt_path TEXT NOT NULL,
          transcript_chunks TEXT NOT NULL,
          downloaded_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS offline_progress (
          lesson_id TEXT PRIMARY KEY,
          playback_offset_sec REAL NOT NULL,
          shadowing_repeat_count INTEGER NOT NULL,
          is_completed INTEGER NOT NULL,
          version INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          is_synced INTEGER NOT NULL DEFAULT 0
        );
      `);
    } catch {
      // Native SQLite may not be available on Web or mock environment
      this.db = null;
    }

    this.initialized = true;
  }

  // --- Lessons CRUD ---
  async saveLesson(lesson: LocalLessonRecord): Promise<void> {
    await this.init();
    if (this.db) {
      this.db.runSync(
        `INSERT OR REPLACE INTO local_lessons (id, title, target_language, duration_sec, local_audio_path, local_srt_path, transcript_chunks, downloaded_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          lesson.id,
          lesson.title,
          lesson.target_language,
          lesson.duration_sec,
          lesson.local_audio_path,
          lesson.local_srt_path,
          lesson.transcript_chunks,
          lesson.downloaded_at,
        ]
      );
    } else {
      this.lessonsFallback.set(lesson.id, { ...lesson });
    }
  }

  async getAllLessons(): Promise<LocalLessonRecord[]> {
    await this.init();
    if (this.db) {
      return this.db.getAllSync<LocalLessonRecord>(
        "SELECT * FROM local_lessons ORDER BY downloaded_at DESC"
      );
    }
    return Array.from(this.lessonsFallback.values());
  }

  async getLessonById(id: string): Promise<LocalLessonRecord | null> {
    await this.init();
    if (this.db) {
      const row = this.db.getFirstSync<LocalLessonRecord>(
        "SELECT * FROM local_lessons WHERE id = ?",
        [id]
      );
      return row || null;
    }
    return this.lessonsFallback.get(id) || null;
  }

  async deleteLesson(id: string): Promise<boolean> {
    await this.init();
    if (this.db) {
      this.db.runSync("DELETE FROM local_lessons WHERE id = ?", [id]);
      this.db.runSync("DELETE FROM offline_progress WHERE lesson_id = ?", [id]);
      return true;
    }
    const removed = this.lessonsFallback.delete(id);
    this.progressFallback.delete(id);
    return removed;
  }

  // --- Offline Progress Tracking & Synchronization ---
  async recordProgress(
    lessonId: string,
    offsetSec: number,
    repeatIncrement = 0,
    isCompleted = false
  ): Promise<OfflineProgressRecord> {
    await this.init();
    let currentVersion = 1;
    let currentRepeat = repeatIncrement;

    if (this.db) {
      const existing = this.db.getFirstSync<OfflineProgressRecord>(
        "SELECT * FROM offline_progress WHERE lesson_id = ?",
        [lessonId]
      );
      if (existing) {
        currentVersion = existing.version + 1;
        currentRepeat = existing.shadowing_repeat_count + repeatIncrement;
      }
    } else {
      const existing = this.progressFallback.get(lessonId);
      if (existing) {
        currentVersion = existing.version + 1;
        currentRepeat = existing.shadowing_repeat_count + repeatIncrement;
      }
    }

    const record: OfflineProgressRecord = {
      lesson_id: lessonId,
      playback_offset_sec: offsetSec,
      shadowing_repeat_count: currentRepeat,
      is_completed: isCompleted ? 1 : 0,
      version: currentVersion,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    if (this.db) {
      this.db.runSync(
        `INSERT OR REPLACE INTO offline_progress (lesson_id, playback_offset_sec, shadowing_repeat_count, is_completed, version, updated_at, is_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          record.lesson_id,
          record.playback_offset_sec,
          record.shadowing_repeat_count,
          record.is_completed,
          record.version,
          record.updated_at,
          record.is_synced ?? 0,
        ]
      );
    } else {
      this.progressFallback.set(lessonId, record);
    }

    return record;
  }

  async getUnsyncedProgress(): Promise<OfflineProgressRecord[]> {
    await this.init();
    if (this.db) {
      return this.db.getAllSync<OfflineProgressRecord>(
        "SELECT * FROM offline_progress WHERE is_synced = 0"
      );
    }
    return Array.from(this.progressFallback.values()).filter((r) => r.is_synced === 0);
  }

  async markProgressAsSynced(lessonIds: string[]): Promise<void> {
    await this.init();
    if (lessonIds.length === 0) return;
    if (this.db) {
      const placeholders = lessonIds.map(() => "?").join(",");
      this.db.runSync(
        `UPDATE offline_progress SET is_synced = 1 WHERE lesson_id IN (${placeholders})`,
        lessonIds
      );
    } else {
      for (const id of lessonIds) {
        const record = this.progressFallback.get(id);
        if (record) {
          record.is_synced = 1;
          this.progressFallback.set(id, record);
        }
      }
    }
  }

  async clearAll(): Promise<void> {
    if (this.db) {
      this.db.execSync(`
        DELETE FROM local_lessons;
        DELETE FROM offline_progress;
      `);
    }
    this.lessonsFallback.clear();
    this.progressFallback.clear();
    this.initialized = false;
  }
}

export const sqliteDb = new SQLiteDatabase();
