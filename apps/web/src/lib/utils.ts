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
  hasCue?: boolean;
}

export interface ScriptValidationResult {
  isValid: boolean;
  pairCount: number;
  warnings: string[];
  errors: string[];
}

/**
 * Parses interleaved tagged script string ([VI]...[EN]... or [VI]...[JA]...) into structured chunks.
 * Accurately extracts [CUE] tags into the pair metadata instead of treating them as Vietnamese sentences.
 */
export function parseTaggedScript(
  content: string,
  targetLang: SupportedLanguage = 'en'
): { chunks: ScriptChunk[]; pairs: ParsedPair[] } {
  if (!content || !content.trim()) {
    return { chunks: [], pairs: [] };
  }

  const rawTagsRegex = /\[(VI|EN|JA|CUE)\]([\s\S]*?)(?=\[(VI|EN|JA|CUE)\]|$)/gi;
  interface TagEntry {
    tag: string;
    text: string;
  }
  const tagEntries: TagEntry[] = [];
  let match: RegExpExecArray | null;

  while ((match = rawTagsRegex.exec(content)) !== null) {
    tagEntries.push({
      tag: match[1].toUpperCase(),
      text: match[2].trim(),
    });
  }

  const chunks: ScriptChunk[] = [];
  const pairs: ParsedPair[] = [];
  let currentVi: string | null = null;
  let currentHasCue = false;
  let pairIdx = 1;
  let chunkOrder = 1;

  for (const entry of tagEntries) {
    if (entry.tag === 'CUE') {
      // Mark cue for the current or upcoming pair
      currentHasCue = true;
      continue;
    }

    if (entry.tag === 'VI') {
      // If there was an unclosed previous VI chunk, push it first as incomplete pair
      if (currentVi !== null) {
        pairs.push({
          id: `pair-${pairIdx}`,
          vi: currentVi,
          target: '',
          order: pairIdx,
          hasCue: currentHasCue,
        });
        pairIdx++;
        currentHasCue = false;
      }

      currentVi = entry.text;
      chunks.push({
        id: `chunk-${chunkOrder}`,
        order: chunkOrder,
        lang: 'vi',
        text: entry.text,
      });
      chunkOrder++;
    } else if (entry.tag === targetLang.toUpperCase()) {
      pairs.push({
        id: `pair-${pairIdx}`,
        vi: currentVi ?? '',
        target: entry.text,
        order: pairIdx,
        hasCue: currentHasCue,
      });
      pairIdx++;
      currentVi = null;
      currentHasCue = false;

      chunks.push({
        id: `chunk-${chunkOrder}`,
        order: chunkOrder,
        lang: targetLang,
        text: entry.text,
      });
      chunkOrder++;
    }
  }

  // If there's an unmatched trailing VI chunk
  if (currentVi !== null) {
    pairs.push({
      id: `pair-${pairIdx}`,
      vi: currentVi,
      target: '',
      order: pairIdx,
      hasCue: currentHasCue,
    });
  }

  return { chunks, pairs };
}

/**
 * Rebuilds interleaved tagged script string from pairs list, preserving CUE tags.
 */
export function rebuildTaggedScriptFromPairs(
  pairsList: ParsedPair[],
  targetLang: SupportedLanguage = 'en'
): string {
  const targetTag = targetLang.toUpperCase();
  return pairsList
    .map((p) => {
      const vi = p.vi.trim();
      const target = p.target.trim();
      const cueLine = p.hasCue ? '\n[CUE]' : '';
      return `[VI] ${vi}${cueLine}\n[${targetTag}] ${target}`;
    })
    .join('\n\n');
}

/**
 * Validates tagged script for common syntax inconsistencies and readability issues.
 */
export function validateTaggedScript(
  content: string,
  targetLang: SupportedLanguage = 'en'
): ScriptValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!content || !content.trim()) {
    return {
      isValid: false,
      pairCount: 0,
      warnings: [],
      errors: ['Kịch bản đang trống. Vui lòng nhập nội dung.'],
    };
  }

  const viMatches = content.match(/\[VI\]/gi) || [];
  const targetTagRegex = new RegExp(`\\[${targetLang}\\]`, 'gi');
  const targetMatches = content.match(targetTagRegex) || [];

  if (viMatches.length === 0) {
    errors.push('Thiếu thẻ [VI]. Cần ít nhất một thẻ [VI] để nhận diện câu tiếng Việt.');
  }

  if (targetMatches.length === 0) {
    errors.push(`Thiếu thẻ [${targetLang.toUpperCase()}]. Cần ít nhất một thẻ câu dịch ngoại ngữ.`);
  }

  if (viMatches.length !== targetMatches.length && viMatches.length > 0 && targetMatches.length > 0) {
    warnings.push(
      `Số lượng thẻ chưa khớp: có ${viMatches.length} thẻ [VI] nhưng có ${targetMatches.length} thẻ [${targetLang.toUpperCase()}]. Một số câu có thể bị thiếu cặp.`
    );
  }

  // Detect unknown or mistyped tags like [VN], [VIE], [ENG], [JP]
  const suspectTags = content.match(/\[(VN|VIE|ENG|JP|JPN|ENGLISH|VIETNAM)\]/gi) || [];
  if (suspectTags.length > 0) {
    const uniqueSuspects = Array.from(new Set(suspectTags.map((t) => t.toUpperCase())));
    warnings.push(
      `Phát hiện thẻ cú pháp lạ: ${uniqueSuspects.join(', ')}. Hệ thống chỉ hỗ trợ [VI], [${targetLang.toUpperCase()}], [CUE].`
    );
  }

  const { pairs } = parseTaggedScript(content, targetLang);

  // Check for overly long sentences (> 25 words) that impair Shadowing effectiveness
  pairs.forEach((pair, idx) => {
    const viWords = countWords(pair.vi);
    const targetWords = countWords(pair.target);

    if (viWords > 28 || targetWords > 28) {
      warnings.push(
        `Cặp câu #${idx + 1} khá dài (${Math.max(viWords, targetWords)} từ). Khuyến nghị chia nhỏ câu để việc luyện Shadowing tự nhiên hơn.`
      );
    }
    if (!pair.vi && pair.target) {
      warnings.push(`Cặp câu #${idx + 1} thiếu nội dung tiếng Việt.`);
    }
    if (pair.vi && !pair.target) {
      warnings.push(`Cặp câu #${idx + 1} thiếu câu dịch ngoại ngữ.`);
    }
  });

  return {
    isValid: errors.length === 0 && pairs.length > 0,
    pairCount: pairs.length,
    warnings,
    errors,
  };
}
