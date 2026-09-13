// Test Suite: Mobile Player Logic & Repeat Chunk Calculation
// English comments only per project rules

import assert from "node:assert";

interface SubtitleChunk {
  id: string;
  startTimeSec: number;
  endTimeSec: number;
  lang: string;
  textVi: string;
  textTarget: string;
}

const SAMPLE_SUBTITLES: SubtitleChunk[] = [
  {
    id: "sub-1",
    startTimeSec: 0.0,
    endTimeSec: 4.2,
    lang: "en",
    textVi: "Chào buổi sáng mọi người.",
    textTarget: "Good morning everyone.",
  },
  {
    id: "sub-2",
    startTimeSec: 4.5,
    endTimeSec: 9.8,
    lang: "en",
    textVi: "Hôm nay chúng ta sẽ xem xét tiến độ.",
    textTarget: "Today we will review progress.",
  },
  {
    id: "sub-3",
    startTimeSec: 10.2,
    endTimeSec: 15.6,
    lang: "en",
    textVi: "Phát âm thanh chạy nền.",
    textTarget: "Background audio playback.",
  },
];

function findActiveSubtitleIndex(currentTimeSec: number, subtitles: SubtitleChunk[]): number {
  for (let i = 0; i < subtitles.length; i++) {
    if (currentTimeSec >= subtitles[i].startTimeSec && currentTimeSec <= subtitles[i].endTimeSec) {
      return i;
    }
  }
  return 0;
}

function calculateRepeatChunkSeek(activeSubtitleIndex: number, subtitles: SubtitleChunk[]): number {
  const currentSub = subtitles[activeSubtitleIndex];
  if (!currentSub) return 0;
  return currentSub.startTimeSec;
}

function calculateSeekOffset(currentTimeSec: number, offsetSec: number, durationSec: number): number {
  return Math.max(0, Math.min(durationSec, currentTimeSec + offsetSec));
}

// 1. Test Active Subtitle Detection
console.log("Running Test 1: Active Subtitle Resolution...");
assert.strictEqual(findActiveSubtitleIndex(2.0, SAMPLE_SUBTITLES), 0, "At 2.0s sub 0 should be active");
assert.strictEqual(findActiveSubtitleIndex(7.1, SAMPLE_SUBTITLES), 1, "At 7.1s sub 1 should be active");
assert.strictEqual(findActiveSubtitleIndex(12.5, SAMPLE_SUBTITLES), 2, "At 12.5s sub 2 should be active");

// 2. Test Repeat Chunk Logic (P0 Shadowing requirement)
console.log("Running Test 2: Repeat Chunk Target Timestamp Calculation...");
const activeIdx = findActiveSubtitleIndex(8.4, SAMPLE_SUBTITLES);
assert.strictEqual(activeIdx, 1);
const repeatTarget = calculateRepeatChunkSeek(activeIdx, SAMPLE_SUBTITLES);
assert.strictEqual(repeatTarget, 4.5, "Repeat chunk must rewind to exactly 4.5s (start of sentence 2)");

// 3. Test Seek Boundaries
console.log("Running Test 3: Seek Boundaries with Clamping...");
assert.strictEqual(calculateSeekOffset(2.0, -5.0, 20.0), 0.0, "Seeking before 0 should clamp to 0");
assert.strictEqual(calculateSeekOffset(18.0, 5.0, 20.0), 20.0, "Seeking beyond duration should clamp to max");
assert.strictEqual(calculateSeekOffset(10.0, -5.0, 20.0), 5.0, "Seeking -5s should correctly yield 5.0s");

console.log("All player logic tests PASSED successfully!");
