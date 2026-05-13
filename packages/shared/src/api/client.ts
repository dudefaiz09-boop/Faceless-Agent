/**
 * SHARED API CLIENT
 * A platform-agnostic fetch wrapper for EduConnect API.
 */

export interface ApiClientOptions extends RequestInit {
  baseUrl?: string;
  getToken?: () => Promise<string | null>;
  onUnauthorized?: () => void;
}

export async function createApiClient(defaultOptions: ApiClientOptions = {}) {
  const { baseUrl = '', getToken, onUnauthorized, ...rest } = defaultOptions;

  return async <T>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = getToken ? await getToken() : null;
    const correlationId = crypto.randomUUID();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Client-Version': (options.headers as any)?.['X-Client-Version'] || 'unknown',
      'X-API-Version': 'v1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as any) || {}),
    };

    const response = await fetch(`${baseUrl}${path}`, {
      ...rest,
      ...options,
      headers,
    });

    if (response.status === 401 && onUnauthorized) {
      onUnauthorized();
    }

    if (!response.ok) {
      const errorData = (await response
        .json()
        .catch(() => ({ message: 'An unexpected error occurred' }))) as { message?: string };
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  };
}
