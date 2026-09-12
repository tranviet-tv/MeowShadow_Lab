/**
 * ==============================================================================
 * MEOWSHADOW LAB - SHARED TYPESCRIPT INTERFACES (@meowshadow/types)
 * ==============================================================================
 * Shared data types between Web Studio (Next.js 15) and Mobile App (React Native/Expo).
 * Standardized based on: docs/4_API_AND_DATA_SCHEMAS.md (v3.2.0)
 * ==============================================================================
 */

// ------------------------------------------------------------------------------
// 1. PRIMITIVE LITERAL TYPES
// ------------------------------------------------------------------------------
export type SupportedLanguage = 'vi' | 'en' | 'ja';
export type TTSEngineType = 'edge-tts' | 'fish-speech' | 'f5-tts' | 'kokoro' | 'piper';
export type DeviceType = 'ios' | 'android' | 'web';
export type AudioExportFormat = 'mp3' | 'wav';
export type AudioBitrate = '128k' | '192k' | '320k';

// ------------------------------------------------------------------------------
// 2. USER & AUTHENTICATION TYPES
// ------------------------------------------------------------------------------
export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  createdAt: string;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  expiresInSec: number;
}

export interface RegisterDevicePayload {
  deviceType: DeviceType;
  pushToken: string;
}

// ------------------------------------------------------------------------------
// 3. SCRIPTS & PACING CONFIGURATION
// ------------------------------------------------------------------------------
export interface ScriptChunk {
  id: string;
  order: number;
  lang: SupportedLanguage;
  text: string;
  voiceId?: string;
  speedRate?: number;
}

export interface PacingConfig {
  viVoice: string;
  targetVoice: string;
  viSpeed: number;
  targetSpeed: number;
  silenceAfterViSec: number;          // Default: 1.5s
  silenceAfterTargetSec: number;      // Default: 3.5s
  silenceBetweenSentencesSec: number; // Default: 0.5s
  insertCueSound: boolean;            // Insert cue chime when switching language
  exportFormat: AudioExportFormat;
  audioBitrate: AudioBitrate;
}

export interface AutoTranslateRequest {
  rawText: string;
  targetLanguage: SupportedLanguage;
}

export interface AutoTranslateResponse {
  formattedScript: string;
  chunks: ScriptChunk[];
  wordCount: number;
  estimatedDurationSec: number;
}

// ------------------------------------------------------------------------------
// 4. LESSONS & KARAOKE SUBTITLES
// ------------------------------------------------------------------------------
export interface LessonItem {
  id: string;
  userId?: string;
  title: string;
  targetLanguage: SupportedLanguage;
  sourceLanguage: 'vi';
  totalWords: number;
  durationSec: number;
  pacingConfig: PacingConfig;
  transcriptChunks: ScriptChunk[];
  audioUrl: string;
  srtUrl: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LessonPagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

export interface LessonListResponse {
  items: LessonItem[];
  pagination: LessonPagination;
}

export interface SubtitleTimestamp {
  id: number;
  startTimeSec: number;
  endTimeSec: number;
  lang: SupportedLanguage;
  text: string;
}

export interface SubtitlesResponse {
  lessonId: string;
  subtitles: SubtitleTimestamp[];
}

// ------------------------------------------------------------------------------
// 5. LEARNING PROGRESS & SYNC
// ------------------------------------------------------------------------------
export interface LearningProgress {
  lessonId: string;
  playbackOffsetSec: number;
  shadowingRepeatCount: number;
  isCompleted: boolean;
  lastListenedAt?: string;
}

export interface SyncProgressPayload {
  lessonId: string;
  playbackOffsetSec: number;
  shadowingRepeatCount: number;
  isCompleted: boolean;
}

// ------------------------------------------------------------------------------
// 6. AUDIO GENERATION TASK & REALTIME WS PROGRESS
// ------------------------------------------------------------------------------
export interface GenerateAudioRequest {
  title: string;
  targetLanguage: SupportedLanguage;
  sourceText: string;
  ttsEngine?: TTSEngineType;
  pacingConfig: PacingConfig;
}

export interface GenerateAudioAcceptedResponse {
  taskId: string;
  status: 'QUEUED';
  message: string;
}

export type TaskStatus =
  | 'QUEUED'
  | 'PARSING'
  | 'SYNTHESIZING'
  | 'MASTERING'
  | 'COMPLETED'
  | 'FAILED';

export interface TaskProgressEvent {
  taskId: string;
  status: TaskStatus;
  progressPercent: number;
  completedChunks?: number;
  totalChunks?: number;
  currentStepMessage: string;
  resultLessonId?: string;
  error?: string;
}

// ------------------------------------------------------------------------------
// 7. STANDARDIZED API RESPONSE SCHEMAS
// ------------------------------------------------------------------------------
export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiErrorDetail;
}
