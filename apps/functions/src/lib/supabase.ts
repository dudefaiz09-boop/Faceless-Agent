import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type DocumentData = Record<string, any>;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the Supabase backend`);
  }
  return value;
}

export function hasSupabaseConfig() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

let cachedAdmin: SupabaseClient | null = null;
let cachedAnon: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  cachedAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAdmin;
}

export function getSupabase() {
  if (cachedAnon) return cachedAnon;

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseServiceRoleKey;

  cachedAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAnon;
}
