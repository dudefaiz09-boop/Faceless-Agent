import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { ENV, mobileConfigReady } from '../config/env';

const FALLBACK_URL = 'https://invalid.supabase.co';
const FALLBACK_KEY = 'invalid-anon-key';

const isConfigured =
  Boolean(ENV.SUPABASE_URL) &&
  Boolean(ENV.SUPABASE_ANON_KEY) &&
  ENV.SUPABASE_URL !== FALLBACK_URL &&
  ENV.SUPABASE_ANON_KEY !== FALLBACK_KEY;

if (!isConfigured) {
  console.error(
    '[EduConnect] Supabase is not configured. Add SUPABASE_URL and SUPABASE_ANON_KEY, then rebuild the APK.'
  );
}

// createClient is safe to call with placeholder values; the app-level
// configuration screen prevents auth/API calls until required config exists.
export const supabase = createClient(
  isConfigured ? ENV.SUPABASE_URL : FALLBACK_URL,
  isConfigured ? ENV.SUPABASE_ANON_KEY : FALLBACK_KEY,
  {
    auth: {
      ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      detectSessionInUrl: false,
      lock: processLock,
      persistSession: true,
    },
  }
);

export const supabaseConfigured = isConfigured && mobileConfigReady;

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (!isConfigured) return;
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

export async function getSupabaseAccessToken() {
  if (!isConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
