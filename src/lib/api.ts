import { auth } from './firebase';

export async function apiFetch(path: string, options: RequestInit = {}, retries = 2) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

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

    return response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Network Error. Retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return apiFetch(path, options, retries - 1);
    }
    throw error;
  }
}
