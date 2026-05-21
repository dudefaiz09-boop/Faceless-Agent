import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../middleware/error.js';

export type DocumentData = Record<string, any>;
export type BackendSupabaseClient = SupabaseClient;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new AppError({
      code: 'CONFIG_MISSING',
      message: `${name} is required for the Supabase backend`,
      statusCode: 503,
      details: { env: name },
    });
  }
  return value;
}

export function hasSupabaseConfig() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

export function hasSupabasePublicConfig() {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;
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
  const supabaseAnonKey = requiredEnv('SUPABASE_ANON_KEY');

  cachedAnon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedAnon;
}

export async function withSupabaseRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; timeoutMs?: number; label?: string } = {}
): Promise<T> {
  const attempts = options.attempts ?? 2;
  const timeoutMs = options.timeoutMs ?? 8_000;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new AppError({
                  code: 'SUPABASE_TIMEOUT',
                  message: 'The data service timed out.',
                  statusCode: 504,
                  details: { label: options.label },
                })
              ),
            timeoutMs
          )
        ),
      ]);
    } catch (error: any) {
      lastError = error;
      const transient =
        error?.code === 'SUPABASE_TIMEOUT' ||
        error?.status === 429 ||
        error?.status >= 500 ||
        /timeout|econnreset|fetch failed/i.test(String(error?.message || ''));
      if (!transient || attempt === attempts - 1) break;
      await new Promise((resolve) => setTimeout(resolve, 150 * Math.pow(2, attempt)));
    }
  }

  throw lastError;
}
