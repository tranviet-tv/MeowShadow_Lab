import { createApiClient, type MeowShadowApiClient } from '@meowshadow/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

let clientInstance: MeowShadowApiClient | null = null;

/**
 * Returns the singleton API client configured for Web Studio.
 */
export function getApiClient(): MeowShadowApiClient {
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseURL: API_BASE_URL,
      wsBaseURL: WS_BASE_URL,
      getToken: () => {
        if (typeof window !== 'undefined') {
          return localStorage.getItem('msl_access_token');
        }
        return null;
      },
      saveToken: (token: string) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('msl_access_token', token);
        }
      },
      onUnauthorized: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('msl_access_token');
        }
      },
    });
  }
  return clientInstance;
}

export const api = getApiClient();
