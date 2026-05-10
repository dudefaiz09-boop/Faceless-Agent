import { auth } from './firebase';

interface ApiOptions extends RequestInit {
  cacheTTL?: number; 
}

/**
 * Enterprise API Client
 * - Automatic Firebase Auth Token injection
 * - Retry logic with exponential backoff
 * - Client-side caching
 * - Correlation IDs for request tracking
 */
export async function apiFetch<T = any>(path: string, options: ApiOptions = {}, retries = 3): Promise<T> {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const isGet = !options.method || options.method === 'GET';
  const correlationId = crypto.randomUUID();

  // 1. Check Cache (Only for GET)
  if (isGet && options.cacheTTL) {
    const cached = localStorage.getItem(`api_cache_${path}`);
    if (cached) {
      try {
        const { data, expiry } = JSON.parse(cached);
        if (expiry > Date.now()) return data;
        localStorage.removeItem(`api_cache_${path}`);
      } catch {
        localStorage.removeItem(`api_cache_${path}`);
      }
    }
  }

  // 2. Prepare Headers
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-Correlation-ID': correlationId,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  // 3. Execute Request
  try {
    const response = await fetch(path, { ...options, headers });
    
    // Handle 401 Unauthorized (Force logout or token refresh could go here)
    if (response.status === 401) {
      console.warn('[API] Unauthorized access detected.');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'An unexpected error occurred' }));
      
      // Retry logic for 5xx or 429
      if (retries > 0 && (response.status >= 500 || response.status === 429)) {
        const delay = Math.pow(2, 3 - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiFetch(path, options, retries - 1);
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 4. Store in Cache
    if (isGet && options.cacheTTL) {
      localStorage.setItem(`api_cache_${path}`, JSON.stringify({
        data,
        expiry: Date.now() + options.cacheTTL
      }));
    }

    return data;
  } catch (error: unknown) {
    if (retries > 0 && (error as Error).name === 'TypeError') { // Network error
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiFetch(path, options, retries - 1);
    }
    throw error;
  }
}
