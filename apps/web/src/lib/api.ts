import { createApiClient, type MeowShadowApiClient } from '@meowshadow/api-client';

function getBaseUrls() {
  if (typeof window !== 'undefined') {
    const customGateway = localStorage.getItem('msl_gateway_url');
    if (customGateway && customGateway.trim()) {
      const base = customGateway.trim().replace(/\/$/, '');
      return {
        apiUrl: base,
        wsUrl: base.replace(/^http/, 'ws'),
      };
    }
  }
  return {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
  };
}

let clientInstance: MeowShadowApiClient | null = null;

/**
 * Resets the API client instance to pick up updated URLs.
 */
export function resetApiClient(): void {
  clientInstance = null;
}

/**
 * Returns the singleton API client configured for Web Studio.
 */
export function getApiClient(): MeowShadowApiClient {
  const { apiUrl, wsUrl } = getBaseUrls();
  if (!clientInstance) {
    clientInstance = createApiClient({
      baseURL: apiUrl,
      wsBaseURL: wsUrl,
      getToken: async () => {
        if (typeof window !== 'undefined') {
          let token = localStorage.getItem('msl_access_token');
          if (!token) {
            try {
              const res = await fetch(`${apiUrl}/api/v1/auth/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
              });
              if (res.ok) {
                const data = await res.json();
                const candidateToken = data.data?.accessToken || data.data?.tokens?.access_token || data.data?.tokens?.accessToken;
                if (candidateToken) {
                  token = candidateToken;
                  localStorage.setItem('msl_access_token', token as string);
                }
              }
            } catch {
              // Gateway might be offline during dev
            }
          }
          return token;
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
