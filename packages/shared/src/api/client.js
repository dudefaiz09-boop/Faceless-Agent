/**
 * SHARED API CLIENT
 * A platform-agnostic fetch wrapper for EduConnect API.
 */
export async function createApiClient(defaultOptions = {}) {
  const { baseUrl = '', getToken, onUnauthorized, ...rest } = defaultOptions;
  return async (path, options = {}) => {
    const token = getToken ? await getToken() : null;
    const correlationId = crypto.randomUUID();
    const headers = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Client-Version': options.headers?.['X-Client-Version'] || 'unknown',
      'X-API-Version': 'v1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
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
      const errorData = await response
        .json()
        .catch(() => ({ message: 'An unexpected error occurred' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  };
}
//# sourceMappingURL=client.js.map
