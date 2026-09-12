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

  return {
    /** Configuration values */
    config: { baseURL, wsBaseURL },

    // =========================================================================
    // 1. AUTHENTICATION SERVICE
    // =========================================================================
    auth: {
      /** Register a new user account */
      async register(payload: { email: string; password: string; fullName?: string }): Promise<ApiResponse<AuthSession>> {
        return request<ApiResponse<AuthSession>>('/api/v1/auth/register', {
          method: 'POST',
          body: payload,
        });
      },

      /** Login with email and password */
      async login(payload: { email: string; password: string }): Promise<ApiResponse<AuthSession>> {
        return request<ApiResponse<AuthSession>>('/api/v1/auth/login', {
          method: 'POST',
          body: payload,
        });
      },

      /** Refresh expired access token */
      async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; expiresInSec: number }>> {
        return request<ApiResponse<{ accessToken: string; expiresInSec: number }>>('/api/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
        });
      },

      /** Register mobile/web push device token */
      async registerDevice(payload: RegisterDevicePayload): Promise<ApiResponse<{ registered: boolean }>> {
        return request<ApiResponse<{ registered: boolean }>>('/api/v1/auth/device', {
          method: 'POST',
          body: payload,
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
        return request<ApiResponse<LessonListResponse>>('/api/v1/lessons', {
          method: 'GET',
          params: params as Record<string, string | number | boolean | undefined>,
        });
      },

      /** Get lesson details by ID */
      async get(id: string): Promise<ApiResponse<LessonItem>> {
        return request<ApiResponse<LessonItem>>(`/api/v1/lessons/${id}`, {
          method: 'GET',
        });
      },

      /** Create a new lesson */
      async create(payload: {
        title: string;
        targetLanguage: SupportedLanguage;
        pacingConfig: PacingConfig;
        transcriptChunks: ScriptChunk[];
      }): Promise<ApiResponse<LessonItem>> {
        return request<ApiResponse<LessonItem>>('/api/v1/lessons', {
          method: 'POST',
          body: payload,
        });
      },

      /** Delete a lesson by ID */
      async delete(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
        return request<ApiResponse<{ deleted: boolean }>>(`/api/v1/lessons/${id}`, {
          method: 'DELETE',
        });
      },

      /** Get subtitle timestamps for a lesson */
      async getSubtitles(id: string): Promise<ApiResponse<SubtitlesResponse>> {
        return request<ApiResponse<SubtitlesResponse>>(`/api/v1/lessons/${id}/subtitles`, {
          method: 'GET',
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
      async generate(payload: GenerateAudioRequest): Promise<ApiResponse<GenerateAudioAcceptedResponse>> {
        return request<ApiResponse<GenerateAudioAcceptedResponse>>('/api/v1/audio/generate', {
          method: 'POST',
          body: payload,
        });
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
        return request<ApiResponse<LearningProgress>>(`/api/v1/progress/${lessonId}`, {
          method: 'GET',
        });
      },

      /** Synchronize local progress back to PostgreSQL */
      async sync(payload: SyncProgressPayload): Promise<ApiResponse<LearningProgress>> {
        return request<ApiResponse<LearningProgress>>('/api/v1/progress/sync', {
          method: 'POST',
          body: payload,
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
      subscribeTaskProgress(taskId: string, callbacks: TaskProgressCallbacks): () => void {
        const url = `${wsBaseURL.replace(/\/$/, '')}/ws/v1/progress?taskId=${encodeURIComponent(taskId)}`;
        let ws: WebSocket | null = null;
        let isClosedManually = false;

        try {
          ws = new WebSocket(url);

          ws.onmessage = (event) => {
            try {
              const data: TaskProgressEvent = JSON.parse(event.data);
              callbacks.onProgress?.(data);

              if (data.status === 'COMPLETED') {
                callbacks.onComplete?.(data.resultLessonId || taskId);
                ws?.close();
              } else if (data.status === 'FAILED') {
                callbacks.onError?.(new Error(data.error || 'Audio generation task failed'));
                ws?.close();
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
