import { auth } from './firebase';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(path, { ...options, headers });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.message || error.error || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}
