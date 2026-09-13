import type { PacingConfig, SupportedLanguage, TTSEngineType } from '@meowshadow/types';

export interface VoiceOption {
  id: string;
  name: string;
  lang: SupportedLanguage;
  gender: 'female' | 'male';
  engine: TTSEngineType;
  accent: string;
  previewSampleText: string;
}

export const SUPPORTED_LANGUAGES: { id: SupportedLanguage; label: string; flag: string }[] = [
  { id: 'en', label: 'English (US)', flag: '🇺🇸' },
  { id: 'ja', label: 'Japanese (日本語)', flag: '🇯🇵' },
  { id: 'vi', label: 'Vietnamese (Tiếng Việt)', flag: '🇻🇳' },
];

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Vietnamese Voices
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Neural)',
    lang: 'vi',
    gender: 'female',
    engine: 'edge-tts',
    accent: 'Miền Bắc',
    previewSampleText: 'Xin chào, tôi là Hoài My. Chúc bạn một ngày học tập hiệu quả!',
  },
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Neural)',
    lang: 'vi',
    gender: 'male',
    engine: 'edge-tts',
    accent: 'Miền Bắc',
    previewSampleText: 'Chào bạn, tôi là Nam Minh. Hãy cùng bắt đầu bài học Shadowing nhé!',
  },

  // English Voices
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (Natural)',
    lang: 'en',
    gender: 'female',
    engine: 'edge-tts',
    accent: 'American Standard',
    previewSampleText: 'Welcome to MeowShadow Lab! Let us practice English together.',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (Natural)',
    lang: 'en',
    gender: 'male',
    engine: 'edge-tts',
    accent: 'American Standard',
    previewSampleText: 'Hello there! Consistency is the secret to mastering fluent speech.',
  },
  {
    id: 'en-US-AriaNeural',
    name: 'Aria (Expressive)',
    lang: 'en',
    gender: 'female',
    engine: 'edge-tts',
    accent: 'American Standard',
    previewSampleText: 'Shadowing this sentence helps improve your vocal rhythm and tone.',
  },

  // Japanese Voices
  {
    id: 'ja-JP-NanamiNeural',
    name: 'Nanami (七海)',
    lang: 'ja',
    gender: 'female',
    engine: 'edge-tts',
    accent: 'Tokyo Standard',
    previewSampleText: 'こんにちは！シャドーイングの練習を一緒に頑張りましょう。',
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: 'Keita (圭太)',
    lang: 'ja',
    gender: 'male',
    engine: 'edge-tts',
    accent: 'Tokyo Standard',
    previewSampleText: '初めまして、けいたです。毎日の継続が語学上達への近道です。',
  },
];

export const DEFAULT_PACING_CONFIG: PacingConfig = {
  viVoice: 'vi-VN-HoaiMyNeural',
  targetVoice: 'en-US-JennyNeural',
  viSpeed: 1.0,
  targetSpeed: 1.0,
  silenceAfterViSec: 1.5,
  silenceAfterTargetSec: 3.5,
  silenceBetweenSentencesSec: 0.5,
  insertCueSound: true,
  exportFormat: 'mp3',
  audioBitrate: '192k',
};

export interface PacingPreset {
  id: string;
  title: string;
  description: string;
  config: Partial<PacingConfig>;
}

export const PACING_PRESETS: PacingPreset[] = [
  {
    id: 'standard-shadowing',
    title: 'Shadowing Chuẩn',
    description: 'Khoảng lặng 3.5s lý tưởng để nhắc lại câu ngoại ngữ một cách trọn vẹn.',
    config: {
      silenceAfterViSec: 1.5,
      silenceAfterTargetSec: 3.5,
      silenceBetweenSentencesSec: 0.5,
      viSpeed: 1.0,
      targetSpeed: 1.0,
      insertCueSound: true,
    },
  },
  {
    id: 'intensive-listening',
    title: 'Luyện Nghe Nhanh',
    description: 'Khoảng lặng ngắn hơn (2.0s) giúp duy trì nhịp độ nghe tập trung cao.',
    config: {
      silenceAfterViSec: 1.0,
      silenceAfterTargetSec: 2.0,
      silenceBetweenSentencesSec: 0.3,
      viSpeed: 1.0,
      targetSpeed: 1.05,
      insertCueSound: true,
    },
  },
  {
    id: 'pronunciation-focus',
    title: 'Tập Trung Phát Âm',
    description: 'Tốc độ chậm hơn (0.9x) và khoảng lặng rộng (4.5s) cho người mới bắt đầu.',
    config: {
      silenceAfterViSec: 2.0,
      silenceAfterTargetSec: 4.5,
      silenceBetweenSentencesSec: 0.8,
      viSpeed: 0.95,
      targetSpeed: 0.9,
      insertCueSound: true,
    },
  },
];

export const SAMPLE_RAW_TEXT = `Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ.
Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày mười lăm phút, khả năng phản xạ và phát âm của bạn sẽ tiến bộ vượt bậc.
Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.`;

export const SAMPLE_TAGGED_SCRIPT = `[VI] Hôm nay là một ngày tuyệt vời để bắt đầu học ngoại ngữ.
[EN] Today is a wonderful day to start learning a new language.

[VI] Khi bạn kiên trì luyện tập phương pháp Shadowing mỗi ngày mười lăm phút, khả năng phát âm của bạn sẽ tiến bộ vượt bậc.
[EN] When you consistently practice the shadowing technique for fifteen minutes every day, your pronunciation will improve dramatically.

[VI] Hãy nghe thật kỹ từng ngữ điệu và nhại lại ngay sau khi câu nói kết thúc.
[EN] Listen carefully to each intonation and repeat immediately after the sentence finishes.`;
