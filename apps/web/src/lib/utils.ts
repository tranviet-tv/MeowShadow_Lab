import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ScriptChunk, SupportedLanguage } from '@meowshadow/types';

/**
 * Merges Tailwind classes safely with clsx and twMerge.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a duration in seconds into a clean MM:SS string.
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration in seconds into a human-readable string (e.g., '1m 45s' or '35s').
 */
export function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

/**
 * Counts words in a string, accounting for CJK (Japanese) characters and space-delimited words.
 */
export function countWords(text: string): number {
  if (!text || !text.trim()) return 0;
  // Remove markdown or bracket tags like [VI], [EN], [JA], [CUE]
  const clean = text.replace(/\[(VI|EN|JA|CUE)\]/gi, '').trim();
  if (!clean) return 0;

  // Count Japanese characters separately if any
  const japaneseChars = clean.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g) || [];
  // Count standard words
  const standardWords = clean
    .replace(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return standardWords.length + japaneseChars.length;
}

/**
 * Estimates speech audio duration in seconds based on words per minute (WPM).
 * Standard Vietnamese/English conversational pace: ~140 WPM.
 */
export function estimateAudioDuration(
  wordCount: number,
  additionalSilenceSec: number = 0,
  wordsPerMinute: number = 140
): number {
  if (wordCount <= 0) return additionalSilenceSec;
  const speechSeconds = (wordCount / wordsPerMinute) * 60;
  return Math.round((speechSeconds + additionalSilenceSec) * 10) / 10;
}

export interface ParsedPair {
  id: string;
  vi: string;
  target: string;
  order: number;
}

/**
 * Parses interleaved tagged script string ([VI]...[EN]... or [VI]...[JA]...) into structured chunks.
 */
export function parseTaggedScript(
  content: string,
  targetLang: SupportedLanguage = 'en'
): { chunks: ScriptChunk[]; pairs: ParsedPair[] } {
  if (!content || !content.trim()) {
    return { chunks: [], pairs: [] };
  }

  const chunks: ScriptChunk[] = [];
  const regex = /\[(VI|EN|JA|CUE)\]([\s\S]*?)(?=\[(VI|EN|JA|CUE)\]|$)/gi;
  let match: RegExpExecArray | null;
  let order = 1;

  while ((match = regex.exec(content)) !== null) {
    const rawTag = match[1].toUpperCase();
    const text = match[2].trim();
    if (!text && rawTag !== 'CUE') continue;

    let lang: SupportedLanguage = 'vi';
    if (rawTag === 'EN') lang = 'en';
    else if (rawTag === 'JA') lang = 'ja';

    chunks.push({
      id: `chunk-${order}-${Date.now()}`,
      order,
      lang,
      text,
    });
    order++;
  }

  // Pair Vietnamese chunks with matching target chunks
  const pairs: ParsedPair[] = [];
  let currentVi = '';
  let pairIdx = 1;

  for (const chunk of chunks) {
    if (chunk.lang === 'vi') {
      currentVi = chunk.text;
    } else if (chunk.lang === targetLang) {
      pairs.push({
        id: `pair-${pairIdx}`,
        vi: currentVi,
        target: chunk.text,
        order: pairIdx,
      });
      pairIdx++;
      currentVi = '';
    }
  }

  // If there's an unmatched trailing VI chunk
  if (currentVi) {
    pairs.push({
      id: `pair-${pairIdx}`,
      vi: currentVi,
      target: '',
      order: pairIdx,
    });
  }

  return { chunks, pairs };
}
