import { NextRequest, NextResponse } from 'next/server';
import type { SupportedLanguage } from '@meowshadow/types';

interface TranslateSentenceRequestBody {
  text: string;
  sourceLang?: SupportedLanguage;
  targetLang?: SupportedLanguage;
  model?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: TranslateSentenceRequestBody = await req.json();
    const { text, sourceLang = 'vi', targetLang = 'en', model } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text cannot be empty.' },
        { status: 400 }
      );
    }

    const candidateUrls = Array.from(
      new Set(
        [
          process.env.SCRIPT_LLM_TRANSLATE_URL,
          'http://script-llm-service:8001/api/v1/translate',
          'http://localhost:8001/api/v1/translate',
        ].filter(Boolean) as string[]
      )
    );

    for (const url of candidateUrls) {
      try {
        const backendResponse = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: text.trim(),
            source_lang: sourceLang,
            target_lang: targetLang,
            model: model || undefined,
          }),
          signal: AbortSignal.timeout(12000), // 12s timeout for single sentence
        });

        if (backendResponse.ok) {
          const data = await backendResponse.json();
          if (data.translated_text) {
            return NextResponse.json({
              success: true,
              translatedText: data.translated_text,
              sourceLang,
              targetLang,
              model: data.model,
            });
          }
        }
      } catch {
        // Continue to fallback URL
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Script-LLM service is currently unreachable. Please verify that script-llm-service is active on port 8001.',
      },
      { status: 503 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Translation request error';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
