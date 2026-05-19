import { z } from 'zod';
import 'dotenv/config';

/**
 * Environment Variables Schema
 * Enforces presence and format of required production keys.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('8080'),

  // Supabase backend configuration.
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  SUPABASE_UPLOADS_BUCKET: z.string().default('educonnect-uploads'),

  // Free AI provider keys. Keep these server-side only.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),

  // Application configuration
  PUBLIC_APP_URL: z.string().optional(),
  CURRENCY: z.string().default('INR'),
});

type Config = z.infer<typeof envSchema>;

/**
 * Validates and returns the environment configuration.
 * Does NOT throw during module import to prevent deployment crashes.
 */
function validateEnv(): Config {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // We log but don't throw to allow diagnostic routes like /api/version to work.
    console.warn(
      '⚠️ Environment validation failed. Some features may be unavailable:',
      JSON.stringify(parsed.error.format(), null, 2)
    );
  }

  // Return parsed data or a partial object from process.env if parsing failed
  return (parsed.success ? parsed.data : (process.env as any)) as Config;
}

// Cached config to avoid re-parsing
let cachedConfig: Config | null = null;

/**
 * Returns the validated environment configuration.
 * Safe to call at any time.
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = validateEnv();
  }
  return cachedConfig;
}

// Deprecated: Use getConfig() instead.
// Kept as a getter for backward compatibility during transition.
export const env = validateEnv();
