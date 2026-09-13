import { NextRequest, NextResponse } from 'next/server';
import type { SupportedLanguage } from '@meowshadow/types';

interface AutoChunkRequestBody {
  rawText: string;
  targetLang?: SupportedLanguage;
  sentencesPerChunk?: number;
}

/**
 * Intelligent fallback generator when backend Script-LLM is offline during dev/test.
 */
function generateFallbackChunks(
  rawText: string,
  targetLang: SupportedLanguage = 'en',
  sentencesPerChunk: number = 2
) {
  // Clean text and split by sentence ending punctuations
  const cleaned = rawText.trim();
  const sentences = cleaned
    .split(/(?<=[.?!…\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: Array<{ order: number; vi: string; target: string }> = [];
  let currentViBatch: string[] = [];

  for (let i = 0; i < sentences.length; i++) {
    currentViBatch.push(sentences[i]);
    if (currentViBatch.length >= sentencesPerChunk || i === sentences.length - 1) {
      const viText = currentViBatch.join(' ');
      let targetText = '';

      if (targetLang === 'ja') {
        targetText = `これは練習用の日本語翻訳です：「${viText.slice(0, 35)}...」`;
      } else {
        // English fallback placeholder
        targetText = `This is the English translation for: "${viText.slice(0, 45)}..."`;
      }

      chunks.push({
        order: chunks.length + 1,
        vi: viText,
        target: targetText,
      });

      currentViBatch = [];
    }
  }

  const targetTag = targetLang.toUpperCase();
  const formattedScript = chunks
    .map((c) => `[VI] ${c.vi}\n[${targetTag}] ${c.target}`)
    .join('\n\n');

  const words = formattedScript.split(/\s+/).filter(Boolean).length;
  const estimatedDuration = Math.round((words / 2.3) + chunks.length * 5);

  return {
    success: true,
    formatted_script: formattedScript,
    chunks: chunks.flatMap((c) => [
      { id: `c-${c.order}-vi`, order: c.order * 2 - 1, lang: 'vi', text: c.vi },
      { id: `c-${c.order}-tgt`, order: c.order * 2, lang: targetLang, text: c.target },
    ]),
    pairs: chunks.map((c) => ({
      id: `pair-${c.order}`,
      order: c.order,
      vi: c.vi,
      target: c.target,
    })),
    word_count: words,
    estimated_duration_sec: estimatedDuration,
    is_fallback: true,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: AutoChunkRequestBody = await req.json();
    const { rawText, targetLang = 'en', sentencesPerChunk = 2 } = body;

    if (!rawText || !rawText.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vui lòng cung cấp văn bản thô để phân đoạn.' },
        { status: 400 }
      );
    }

    const scriptLlmUrl =
      process.env.SCRIPT_LLM_URL || 'http://localhost:8002/api/v1/auto-chunk';

    try {
      const backendResponse = await fetch(scriptLlmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw_text: rawText,
          target_lang: targetLang,
          sentences_per_chunk: sentencesPerChunk,
        }),
        signal: AbortSignal.timeout(4000), // 4s timeout before fallback
      });

      if (backendResponse.ok) {
        const data = await backendResponse.json();
        return NextResponse.json(data);
      }
    } catch {
      // Backend not available or timed out, gracefully use fallback parser
    }

    // Return intelligent fallback result
    const fallbackData = generateFallbackChunks(rawText, targetLang, sentencesPerChunk);
    return NextResponse.json(fallbackData);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Lỗi xử lý AI Auto-Chunk';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
