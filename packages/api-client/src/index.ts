/**
 * ==============================================================================
 * MEOWSHADOW LAB - API CLIENT SDK (@meowshadow/api-client)
 * ==============================================================================
 * Type-safe HTTP & WebSocket client shared across Next.js 15 Web Studio & React Native Mobile.
 * Built with native Fetch for zero-dependency universal support (Browser, Node 18+, React Native).
 * Standardized on @meowshadow/types schemas.
 * ==============================================================================
 */

import type {
  ApiResponse,
  AuthSession,
  GenerateAudioAcceptedResponse,
  GenerateAudioRequest,
  LearningProgress,
  LessonItem,
  LessonListResponse,
  RegisterDevicePayload,
  ScriptChunk,
  PacingConfig,
  SubtitlesResponse,
  SupportedLanguage,
  SyncProgressPayload,
  TaskProgressEvent,
} from '@meowshadow/types';

// Export all types from @meowshadow/types for consumer convenience
export * from '@meowshadow/types';

/**
 * Configuration options for initializing the MeowShadow API Client.
 */
export interface ApiClientConfig {
  baseURL: string;
  wsBaseURL?: string;
  getToken?: () => string | null | Promise<string | null>;
  saveToken?: (token: string) => void | Promise<void>;
  onUnauthorized?: () => void;
  timeoutMs?: number;
}

/**
 * Request options for individual HTTP calls.
 */
export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
}

/**
 * Callback handlers for real-time task progress subscription.
 */
export interface TaskProgressCallbacks {
  onProgress?: (event: TaskProgressEvent) => void;
  onComplete?: (lessonId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Creates and configures the MeowShadow API Client instance.
 */
export function createApiClient(config: ApiClientConfig) {
  const {
    baseURL,
    wsBaseURL = baseURL.replace(/^http/, 'ws'),
    getToken,
    onUnauthorized,
    timeoutMs = 30000,
  } = config;

  /**
   * Internal generic request helper using native fetch
   */
  async function request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options;

    // Build URL with query parameters
    let url = `${baseURL.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          searchParams.append(key, String(value));
        }
      }
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }

    // Default request headers
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...headers,
    };

    // Attach authorization bearer token if available
    if (getToken) {
      const token = await getToken();
      if (token) {
        reqHeaders['Authorization'] = `Bearer ${token}`;
      }
    }

    // Abort controller for timeout
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method,
        headers: reqHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (res.status === 401 && onUnauthorized) {
        onUnauthorized();
        // Attempt a single retry if token provider is configured
        if (getToken) {
          const freshToken = await getToken();
          if (freshToken) {
            reqHeaders['Authorization'] = `Bearer ${freshToken}`;
            const retryRes = await fetch(url, {
              method,
              headers: reqHeaders,
              body: body !== undefined ? JSON.stringify(body) : undefined,
            });
            if (retryRes.ok) {
              return (await retryRes.json()) as T;
            }
          }
        }
      }

      if (!res.ok) {
        let errorData: unknown;
        try {
          errorData = await res.json();
        } catch {
          errorData = await res.text();
        }
        throw new Error(`HTTP Error ${res.status}: ${JSON.stringify(errorData)}`);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timerId);
    }
  }

  function normalizeAuthResponse(raw: any): ApiResponse<AuthSession> {
    if (!raw || !raw.data) return raw;
    const d = raw.data;
    const accessToken = d.accessToken || d.tokens?.access_token || d.access_token || '';
    const refreshToken = d.refreshToken || d.tokens?.refresh_token || d.refresh_token || '';
    const expiresInSec = d.expiresInSec || d.tokens?.expires_in || d.expires_in || 3600;
    return {
      ...raw,
      data: {
        user: d.user,
        accessToken,
        refreshToken,
        expiresInSec,
        tokens: d.tokens,
      } as unknown as AuthSession,
    };
  }

  function normalizeLessonItem(raw: any): LessonItem {
    if (!raw) return raw;
    const id = raw.id || '';
    return {
      id,
      userId: raw.userId || raw.user_id,
      title: raw.title || '',
      targetLanguage: raw.targetLanguage || raw.target_language || 'en',
      sourceLanguage: raw.sourceLanguage || raw.source_language || 'vi',
      totalWords: raw.totalWords ?? raw.total_words ?? 0,
      durationSec: raw.durationSec ?? raw.duration_sec ?? 0,
      pacingConfig: raw.pacingConfig || raw.pacing_config || {},
      transcriptChunks: raw.transcriptChunks || raw.transcript_chunks || [],
      audioUrl: raw.audioUrl || (id ? `${baseURL.replace(/\/$/, '')}/api/v1/audio/stream/${id}` : ''),
      srtUrl: raw.srtUrl || (id ? `${baseURL.replace(/\/$/, '')}/api/v1/lessons/${id}/export?format=srt` : ''),
      createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.updated_at,
    };
  }

  return {
    /** Configuration values */
    config: { baseURL, wsBaseURL },

    // =========================================================================
    // 1. AUTHENTICATION SERVICE
    // =========================================================================
    auth: {
      /** Register a new user account */
      async register(payload: { email: string; password: string; fullName?: string }): Promise<ApiResponse<AuthSession>> {
        const body = {
          email: payload.email,
          password: payload.password,
          full_name: payload.fullName,
          fullName: payload.fullName,
        };
        const res = await request<any>('/api/v1/auth/register', {
          method: 'POST',
          body,
        });
        return normalizeAuthResponse(res);
      },

      /** Login with email and password */
      async login(payload: { email: string; password: string }): Promise<ApiResponse<AuthSession>> {
        const res = await request<any>('/api/v1/auth/login', {
          method: 'POST',
          body: payload,
        });
        return normalizeAuthResponse(res);
      },

      /** Login as guest without credentials */
      async guest(): Promise<ApiResponse<AuthSession>> {
        const res = await request<any>('/api/v1/auth/guest', {
          method: 'POST',
        });
        return normalizeAuthResponse(res);
      },

      /** Refresh expired access token */
      async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; expiresInSec: number }>> {
        const body = {
          refresh_token: refreshToken,
          refreshToken,
        };
        return request<ApiResponse<{ accessToken: string; expiresInSec: number }>>('/api/v1/auth/refresh', {
          method: 'POST',
          body,
        });
      },

      /** Register mobile/web push device token */
      async registerDevice(payload: RegisterDevicePayload): Promise<ApiResponse<{ registered: boolean }>> {
        const body = {
          device_type: payload.deviceType,
          deviceType: payload.deviceType,
          push_token: payload.pushToken,
          pushToken: payload.pushToken,
        };
        return request<ApiResponse<{ registered: boolean }>>('/api/v1/auth/device', {
          method: 'POST',
          body,
        });
      },
    },

    // =========================================================================
    // 2. LESSONS SERVICE
    // =========================================================================
    lessons: {
      /** List paginated lessons with optional language filter */
      async list(params?: {
        page?: number;
        limit?: number;
        targetLanguage?: SupportedLanguage;
      }): Promise<ApiResponse<LessonListResponse>> {
        const res = await request<any>('/api/v1/lessons', {
          method: 'GET',
          params: params as Record<string, string | number | boolean | undefined>,
        });
        if (res && res.data) {
          const rawItems = Array.isArray(res.data) ? res.data : (res.data.items || []);
          const normalized = rawItems.map(normalizeLessonItem);
          res.data = {
            items: normalized,
            pagination: res.pagination || res.data.pagination || {
              currentPage: params?.page || 1,
              totalPages: 1,
              totalItems: normalized.length,
              limit: params?.limit || 10,
            },
          };
        }
        return res;
      },

      /** Get lesson details by ID */
      async get(id: string): Promise<ApiResponse<LessonItem>> {
        const res = await request<any>(`/api/v1/lessons/${id}`, {
          method: 'GET',
        });
        if (res && res.data) {
          res.data = normalizeLessonItem(res.data);
        }
        return res;
      },

      /** Alias for get(id) */
      async getById(id: string): Promise<ApiResponse<LessonItem>> {
        return this.get(id);
      },

      /** Create a new lesson */
      async create(payload: {
        title: string;
        targetLanguage: SupportedLanguage;
        pacingConfig: PacingConfig;
        transcriptChunks: ScriptChunk[];
        totalWords?: number;
        durationSec?: number;
      }): Promise<ApiResponse<LessonItem>> {
        const body = {
          title: payload.title,
          target_language: payload.targetLanguage,
          targetLanguage: payload.targetLanguage,
          source_language: 'vi',
          sourceLanguage: 'vi',
          total_words: payload.totalWords || 0,
          totalWords: payload.totalWords || 0,
          duration_sec: payload.durationSec || 0,
          durationSec: payload.durationSec || 0,
          pacing_config: {
            vi_voice: payload.pacingConfig.viVoice,
            target_voice: payload.pacingConfig.targetVoice,
            vi_speed: payload.pacingConfig.viSpeed,
            target_speed: payload.pacingConfig.targetSpeed,
            silence_after_vi_sec: payload.pacingConfig.silenceAfterViSec,
            silence_after_target_sec: payload.pacingConfig.silenceAfterTargetSec,
            silence_between_sentences_sec: payload.pacingConfig.silenceBetweenSentencesSec,
            insert_cue_sound: payload.pacingConfig.insertCueSound,
            ...payload.pacingConfig,
          },
          pacingConfig: payload.pacingConfig,
          transcript_chunks: payload.transcriptChunks,
          transcriptChunks: payload.transcriptChunks,
        };
        const res = await request<any>('/api/v1/lessons', {
          method: 'POST',
          body,
        });
        if (res && res.data) {
          res.data = normalizeLessonItem(res.data);
        }
        return res;
      },

      /** Delete a lesson by ID */
      async delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
        return request<ApiResponse<{ deleted: boolean }>>(`/api/v1/lessons/${id}`, {
          method: 'DELETE',
        });
      },

      /** Get subtitle timestamps for a lesson */
      async getSubtitles(id: string): Promise<ApiResponse<SubtitlesResponse>> {
        return request<ApiResponse<SubtitlesResponse>>(`/api/v1/lessons/${id}/subtitles?format=json`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
      },

      /** Get audio waveform peaks for visualizer */
      async getWaveform(id: string): Promise<ApiResponse<{ peaks: number[]; durationSec: number }>> {
        return request<ApiResponse<{ peaks: number[]; durationSec: number }>>(`/api/v1/lessons/${id}/waveform`, {
          method: 'GET',
        });
      },
    },

    // =========================================================================
    // 3. AUDIO GENERATION & STREAMING SERVICE
    // =========================================================================
    audio: {
      /** Trigger asynchronous audio generation task */
      async generate(payload: GenerateAudioRequest & { transcriptChunks?: ScriptChunk[]; transcript_chunks?: ScriptChunk[] }): Promise<ApiResponse<GenerateAudioAcceptedResponse>> {
        const pConfig = payload.pacingConfig;
        const normalizedPacing = {
          ...pConfig,
          vi_voice: pConfig?.viVoice,
          target_voice: pConfig?.targetVoice,
          vi_speed: pConfig?.viSpeed ?? 1.0,
          target_speed: pConfig?.targetSpeed ?? 1.0,
          silence_after_vi_sec: pConfig?.silenceAfterViSec ?? 1.5,
          silence_after_target_sec: pConfig?.silenceAfterTargetSec ?? 3.5,
          silence_between_sentences_sec: pConfig?.silenceBetweenSentencesSec ?? 0.5,
          insert_cue_sound: pConfig?.insertCueSound ?? true,
          export_format: pConfig?.exportFormat ?? 'mp3',
          audio_bitrate: pConfig?.audioBitrate ?? '192k',
        };
        const body = {
          lesson_id: payload.lessonId,
          lessonId: payload.lessonId,
          title: payload.title,
          target_language: payload.targetLanguage,
          targetLanguage: payload.targetLanguage,
          source_language: 'vi',
          sourceLanguage: 'vi',
          source_text: payload.sourceText,
          sourceText: payload.sourceText,
          tts_engine: payload.ttsEngine,
          ttsEngine: payload.ttsEngine,
          pacing_config: normalizedPacing,
          pacingConfig: normalizedPacing,
          transcript_chunks: payload.transcriptChunks || payload.transcript_chunks,
          transcriptChunks: payload.transcriptChunks || payload.transcript_chunks,
        };
        const res = await request<ApiResponse<any>>('/api/v1/audio/generate', {
          method: 'POST',
          body,
        });
        const rawData = res.data || {};
        const normalizedTaskId = rawData.taskId || rawData.task_id || '';
        const normalizedLessonId = rawData.lessonId || rawData.lesson_id || payload.lessonId || '';
        return {
          ...res,
          data: {
            ...rawData,
            taskId: normalizedTaskId,
            lessonId: normalizedLessonId,
          },
        };
      },

      /** Preview voice synthesis as audio blob */
      async preview(payload: {
        text: string;
        voiceId: string;
        engine?: string;
        rate?: string | number;
        pitch?: string;
        volume?: string;
      }): Promise<Blob> {
        let previewToken = '';
        if (getToken) {
          previewToken = (await getToken()) || '';
        }
        const reqHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg, audio/wav, application/octet-stream',
        };
        if (previewToken) {
          reqHeaders['Authorization'] = `Bearer ${previewToken}`;
        }
        const res = await fetch(`${baseURL.replace(/\/$/, '')}/api/v1/audio/preview`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            text: payload.text,
            voice_id: payload.voiceId,
            voiceId: payload.voiceId,
            engine: payload.engine || 'edge-tts',
            rate:
              typeof payload.rate === 'number'
                ? `${payload.rate >= 1 ? '+' : '-'}${Math.round(Math.abs(payload.rate - 1) * 100)}%`
                : payload.rate || '+0%',
            pitch: payload.pitch || '+0Hz',
            volume: payload.volume || '+0%',
          }),
        });
        if (!res.ok) {
          throw new Error(`Preview synthesis failed: HTTP ${res.status}`);
        }
        return await res.blob();
      },

      /** Get HTTP 206 Partial Content range audio stream URL */
      getStreamingUrl(lessonId: string): string {
        return `${baseURL.replace(/\/$/, '')}/api/v1/audio/stream/${lessonId}`;
      },

      /** Get download URL for lesson audio or subtitle package */
      getDownloadUrl(lessonId: string, format: 'mp3' | 'srt' | 'vtt' | 'zip' = 'mp3'): string {
        return `${baseURL.replace(/\/$/, '')}/api/v1/lessons/${lessonId}/export?format=${format}`;
      },
    },

    // =========================================================================
    // 4. LEARNING PROGRESS SERVICE
    // =========================================================================
    progress: {
      /** Get playback and shadowing progress for a lesson */
      async get(lessonId: string): Promise<ApiResponse<LearningProgress>> {
        const res = await request<any>(`/api/v1/progress/${lessonId}`, {
          method: 'GET',
        });
        if (res && res.data) {
          const d = res.data;
          res.data = {
            lessonId: d.lessonId || d.lesson_id,
            userId: d.userId || d.user_id,
            playbackOffsetSec: d.playbackOffsetSec ?? d.playback_offset_sec ?? 0,
            shadowingRepeatCount: d.shadowingRepeatCount ?? d.shadowing_repeat_count ?? 0,
            isCompleted: d.isCompleted ?? d.is_completed ?? false,
            version: d.version ?? 1,
            lastListenedAt: d.lastListenedAt || d.last_listened_at,
          };
        }
        return res;
      },

      /** Synchronize local progress back to PostgreSQL */
      async sync(payload: SyncProgressPayload): Promise<ApiResponse<LearningProgress>> {
        const body = {
          lesson_id: payload.lessonId,
          lessonId: payload.lessonId,
          playback_offset_sec: payload.playbackOffsetSec,
          playbackOffsetSec: payload.playbackOffsetSec,
          shadowing_repeat_count: payload.shadowingRepeatCount,
          shadowingRepeatCount: payload.shadowingRepeatCount,
          is_completed: payload.isCompleted,
          isCompleted: payload.isCompleted,
        };
        return request<ApiResponse<LearningProgress>>('/api/v1/progress/sync', {
          method: 'POST',
          body,
        });
      },
    },

    // =========================================================================
    // 5. WEBSOCKET REALTIME PROGRESS SERVICE
    // =========================================================================
    ws: {
      /**
       * Subscribe to real-time audio generation task progress events.
       * Returns an unsubscribe function to cleanly close the WebSocket.
       */
      subscribeTaskProgress(
        taskId: string,
        callbacks: TaskProgressCallbacks,
        lessonId?: string
      ): () => void {
        const params = new URLSearchParams();
        if (taskId) {
          params.set('job_id', taskId);
          params.set('taskId', taskId);
          params.set('task_id', taskId);
        }
        if (lessonId) {
          params.set('lesson_id', lessonId);
          params.set('lessonId', lessonId);
        }
        const url = `${wsBaseURL.replace(/\/$/, '')}/ws/progress?${params.toString()}`;
        let ws: WebSocket | null = null;
        let isClosedManually = false;

        try {
          ws = new WebSocket(url);

          ws.onmessage = (event) => {
            try {
              // Support multiple newline-delimited JSON messages within a single frame
              const lines = String(event.data)
                .split('\n')
                .map((l) => l.trim())
                .filter(Boolean);

              for (const line of lines) {
                const data: TaskProgressEvent = JSON.parse(line);
                callbacks.onProgress?.(data);

                if (data.status === 'COMPLETED' || data.status === 'READY') {
                  callbacks.onComplete?.(data.resultLessonId || (data as any).lesson_id || taskId);
                  ws?.close();
                } else if (data.status === 'FAILED') {
                  callbacks.onError?.(new Error(data.error || 'Audio generation task failed'));
                  ws?.close();
                }

              }
            } catch (err) {
              callbacks.onError?.(err instanceof Error ? err : new Error('Invalid JSON payload'));
            }
          };

          ws.onerror = () => {
            if (!isClosedManually) {
              callbacks.onError?.(new Error('WebSocket connection error'));
            }
          };
        } catch (err) {
          callbacks.onError?.(err instanceof Error ? err : new Error('Failed to connect WebSocket'));
        }

        // Return cleanup callback
        return () => {
          isClosedManually = true;
          if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
          }
        };
      },
    },
  };
}

export type MeowShadowApiClient = ReturnType<typeof createApiClient>;
