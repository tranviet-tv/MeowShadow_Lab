// Test Suite: Mobile SQLite Offline Storage and Cloud Synchronization
// English comments only per project rules

import assert from "node:assert";
import { sqliteDb, LocalLessonRecord } from "../src/db/sqlite.ts";
import { offlineManager } from "../src/services/offlineManager.ts";

async function runOfflineSqliteTests() {
  console.log("Running Test 1: Initialize and Seed SQLite...");
  await sqliteDb.init();
  const initialLessons = await sqliteDb.getAllLessons();
  assert(initialLessons.length >= 1, "Should have at least 1 default seed lesson");
  assert.strictEqual(initialLessons[0].id, "lesson-en-001");

  console.log("Running Test 2: Save and Retrieve New Offline Lesson...");
  const newLesson: LocalLessonRecord = {
    id: "lesson-ja-002",
    title: "Tokyo Business Etiquette & Keigo",
    target_language: "ja",
    duration_sec: 615.0,
    local_audio_path: "file:///app_storage/audio/lesson-ja-002.mp3",
    local_srt_path: "file:///app_storage/subtitles/lesson-ja-002.srt",
    transcript_chunks: JSON.stringify([{ id: "c1", startTimeSec: 0, endTimeSec: 3.5, lang: "ja", textVi: "Xin chào", textTarget: "Konnichiwa" }]),
    downloaded_at: new Date().toISOString(),
  };

  await sqliteDb.saveLesson(newLesson);
  const fetched = await sqliteDb.getLessonById("lesson-ja-002");
  assert(fetched !== null, "Lesson should be retrievable from SQLite");
  assert.strictEqual(fetched?.title, "Tokyo Business Etiquette & Keigo");

  console.log("Running Test 3: Record Playback Progress & Revision Versioning...");
  const p1 = await sqliteDb.recordProgress("lesson-ja-002", 45.0, 3, false);
  assert.strictEqual(p1.playback_offset_sec, 45.0);
  assert.strictEqual(p1.shadowing_repeat_count, 3);
  assert.strictEqual(p1.version, 1);
  assert.strictEqual(p1.is_synced, 0);

  // Increment progress again - version should increase to 2
  const p2 = await sqliteDb.recordProgress("lesson-ja-002", 120.0, 2, true);
  assert.strictEqual(p2.playback_offset_sec, 120.0);
  assert.strictEqual(p2.shadowing_repeat_count, 5); // 3 + 2 = 5
  assert.strictEqual(p2.version, 2);
  assert.strictEqual(p2.is_completed, 1);

  console.log("Running Test 4: Unsynced Progress Query & Cloud Sync Engine...");
  const unsynced = await sqliteDb.getUnsyncedProgress();
  assert(unsynced.length >= 1, "Should identify pending unsynced records");
  assert(unsynced.some((r) => r.lesson_id === "lesson-ja-002"));

  // Trigger sync manager
  const syncResult = await offlineManager.syncOfflineProgress();
  assert.strictEqual(syncResult.success, true);
  assert(syncResult.syncedLessonIds.includes("lesson-ja-002"));

  // Check that all records are now marked as synced
  const remainingUnsynced = await sqliteDb.getUnsyncedProgress();
  assert.strictEqual(remainingUnsynced.length, 0, "No unsynced records should remain");

  console.log("Running Test 5: Delete Lesson from SQLite...");
  const deleted = await sqliteDb.deleteLesson("lesson-ja-002");
  assert.strictEqual(deleted, true);
  const checkDeleted = await sqliteDb.getLessonById("lesson-ja-002");
  assert.strictEqual(checkDeleted, null, "Deleted lesson should not exist in SQLite");

  console.log("All SQLite offline storage & sync tests PASSED successfully!");
}

runOfflineSqliteTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
