import { FirebaseStorageProvider } from './firebase-storage.js';
import { SupabaseStorageProvider } from './supabase-storage.js';
import type { StorageProvider } from './types.js';

let firebaseInstance: StorageProvider | null = null;
let supabaseInstance: StorageProvider | null = null;

export function getStorageProvider(forceProvider?: string): StorageProvider {
  const providerName = forceProvider || process.env.STORAGE_PROVIDER || 'supabase';

  if (providerName === 'firebase') {
    if (!firebaseInstance) firebaseInstance = new FirebaseStorageProvider();
    return firebaseInstance;
  } else {
    if (!supabaseInstance) supabaseInstance = new SupabaseStorageProvider();
    return supabaseInstance;
  }
}
