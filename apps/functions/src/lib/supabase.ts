import { createClient } from '@supabase/supabase-js';

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required for the Supabase backend`);
  }
  return value;
}

export const supabaseUrl = requiredEnv('SUPABASE_URL');
export const supabaseServiceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
export const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || supabaseServiceRoleKey;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type DocumentData = Record<string, any>;
