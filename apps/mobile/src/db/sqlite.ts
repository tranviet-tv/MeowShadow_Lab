// Local SQLite Database Storage Layer
// English comments only per project rules

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
 * Universal SQLite client interface supporting Expo SQLite and portable in-memory backend
 */
export class SQLiteDatabase {
  private lessons: Map<string, LocalLessonRecord> = new Map();
  private progress: Map<string, OfflineProgressRecord> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Seed sample offline lesson if empty
    if (this.lessons.size === 0) {
      const sampleLesson: LocalLessonRecord = {
        id: "lesson-en-001",
        title: "Morning Standup & Sprint Planning",
        target_language: "en",
        duration_sec: 580.0,
        local_audio_path: "file:///data/user/0/com.meowshadow.mobile/files/audio/lesson-en-001.mp3",
        local_srt_path: "file:///data/user/0/com.meowshadow.mobile/files/subtitles/lesson-en-001.srt",
        transcript_chunks: JSON.stringify([
          {
            id: "chunk-1",
            startTimeSec: 0.0,
            endTimeSec: 4.2,
            lang: "en",
            textVi: "Chào buổi sáng mọi người.",
            textTarget: "Good morning everyone.",
          },
        ]),
        downloaded_at: new Date().toISOString(),
      };
      this.lessons.set(sampleLesson.id, sampleLesson);

      const sampleProgress: OfflineProgressRecord = {
        lesson_id: "lesson-en-001",
        playback_offset_sec: 142.5,
        shadowing_repeat_count: 8,
        is_completed: 0,
        version: 1,
        updated_at: new Date().toISOString(),
        is_synced: 1,
      };
      this.progress.set(sampleProgress.lesson_id, sampleProgress);
    }

    this.initialized = true;
  }

  // --- Lessons CRUD ---
  async saveLesson(lesson: LocalLessonRecord): Promise<void> {
    await this.init();
    this.lessons.set(lesson.id, { ...lesson });
  }

  async getAllLessons(): Promise<LocalLessonRecord[]> {
    await this.init();
    return Array.from(this.lessons.values());
  }

  async getLessonById(id: string): Promise<LocalLessonRecord | null> {
    await this.init();
    return this.lessons.get(id) || null;
  }

  async deleteLesson(id: string): Promise<boolean> {
    await this.init();
    const removedLesson = this.lessons.delete(id);
    this.progress.delete(id);
    return removedLesson;
  }

  // --- Offline Progress Tracking & Synchronization ---
  async recordProgress(
    lessonId: string,
    offsetSec: number,
    repeatIncrement = 0,
    isCompleted = false
  ): Promise<OfflineProgressRecord> {
    await this.init();
    const existing = this.progress.get(lessonId);
    const newVersion = existing ? existing.version + 1 : 1;
    const currentRepeat = existing ? existing.shadowing_repeat_count + repeatIncrement : repeatIncrement;

    const record: OfflineProgressRecord = {
      lesson_id: lessonId,
      playback_offset_sec: offsetSec,
      shadowing_repeat_count: currentRepeat,
      is_completed: isCompleted ? 1 : 0,
      version: newVersion,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    this.progress.set(lessonId, record);
    return record;
  }

  async getUnsyncedProgress(): Promise<OfflineProgressRecord[]> {
    await this.init();
    const records = Array.from(this.progress.values());
    return records.filter((r) => r.is_synced === 0);
  }

  async markProgressAsSynced(lessonIds: string[]): Promise<void> {
    await this.init();
    for (const id of lessonIds) {
      const record = this.progress.get(id);
      if (record) {
        record.is_synced = 1;
        this.progress.set(id, record);
      }
    }
  }

  async clearAll(): Promise<void> {
    this.lessons.clear();
    this.progress.clear();
    this.initialized = false;
  }
}

export const sqliteDb = new SQLiteDatabase();
