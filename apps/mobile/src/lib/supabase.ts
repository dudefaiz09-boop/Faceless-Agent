import { createClient } from '@supabase/supabase-js';
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
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

export const supabaseConfigured = isConfigured && mobileConfigReady;

export async function getSupabaseAccessToken() {
  if (!isConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}
