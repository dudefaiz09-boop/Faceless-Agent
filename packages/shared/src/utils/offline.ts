/**
 * SHARED OFFLINE UTILS
 */

export const OFFLINE_CONFIG = {
  CACHE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  SYNCHRONIZE_ON_RECONNECT: true,
};

export function isOnline(): boolean {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return (navigator as any).onLine as boolean;
  }
  return true; // Default to true if cannot detect
}
