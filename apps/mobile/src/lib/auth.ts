import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { getAuthErrorMessage } from '@educonnect/shared';

/**
 * Environment variables support both native and migration aliases
 * as specified in MOBILE_BUILD_GUIDE.md
 */
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';

const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Fail-fast logic similar to apps/web/src/lib/env.ts
  console.warn('Mobile Supabase configuration is incomplete. Authentication will fail.');
}

/**
 * Supabase client configured for React Native environment
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Set to true if using deep links for Magic Links/OAuth
  },
});

/**
 * Standardized error handling wrapper for mobile auth actions
 */
export function formatAuthError(error: unknown): string {
  return getAuthErrorMessage(error);
}

/**
 * Helper for mobile sign-in that ensures consistent error messaging
 */
export async function signInWithEmail(email: string, pass: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    return { data: null, error: formatAuthError(err) };
  }
}
