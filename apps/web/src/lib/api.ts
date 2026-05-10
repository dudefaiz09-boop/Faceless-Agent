import { auth } from './firebase';

interface ApiOptions extends RequestInit {
  cacheTTL?: number; // Time to live in milliseconds
}

export async function apiFetch(path: string, options: ApiOptions = {}, retries = 2) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;
  const isGet = !options.method || options.method === 'GET';

  // Check Cache
  if (isGet && options.cacheTTL) {
    const cached = localStorage.getItem(`api_cache_${path}`);
    if (cached) {
      try {
        const { data, expiry } = JSON.parse(cached);
        if (expiry > Date.now()) {
          return data;
        }
        localStorage.removeItem(`api_cache_${path}`);
      } catch {
        localStorage.removeItem(`api_cache_${path}`);
      }
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(path, { ...options, headers });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      // Retry for server errors or rate limiting
      if (retries > 0 && (response.status >= 500 || response.status === 429)) {
        console.warn(`API Error ${response.status}. Retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return apiFetch(path, options, retries - 1);
      }
      
      throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Store in Cache
    if (isGet && options.cacheTTL) {
      localStorage.setItem(`api_cache_${path}`, JSON.stringify({
        data,
        expiry: Date.now() + options.cacheTTL
      }));
    }

    return data;
  } catch (error) {
    if (retries > 0) {
      console.warn(`Network Error. Retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiFetch(path, options, retries - 1);
    }
    throw error;
  }
}
