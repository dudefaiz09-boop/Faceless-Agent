/**
 * SHARED OFFLINE UTILS
 */
export const OFFLINE_CONFIG = {
  CACHE_SIZE_BYTES: 100 * 1024 * 1024, // 100MB
  SYNCHRONIZE_ON_RECONNECT: true,
};
export function isOnline() {
  if (typeof navigator !== 'undefined' && 'onLine' in navigator) {
    return navigator.onLine;
  }
  return true; // Default to true if cannot detect
}
//# sourceMappingURL=offline.js.map
