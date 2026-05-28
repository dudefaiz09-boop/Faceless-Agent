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

  // Storage provider configuration.
  // "firebase" = Firebase Storage for new uploads (recommended).
  // "supabase" = legacy Supabase Storage (backward compat reads only).
  STORAGE_PROVIDER: z.enum(['firebase', 'supabase']).default('supabase'),

  // Firebase Storage (required when STORAGE_PROVIDER=firebase).
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_STORAGE_BUCKET: z.string().optional(),
  FIREBASE_SIGNED_URL_TTL_SECONDS: z.string().transform(Number).default('900'),
  MAX_UPLOAD_BYTES: z.string().transform(Number).default('52428800'),

  // Free AI provider keys. Keep these server-side only.
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),

  // Application configuration.
  PUBLIC_APP_URL: z.string().optional(),
  CURRENCY: z.string().default('INR'),
});

export type RuntimeConfig = z.infer<typeof envSchema>;

/**
 * Validates and returns the environment configuration.
 * This is intentionally lazy so importing the Express app cannot crash public diagnostics.
 */
export function getConfig(): RuntimeConfig {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = JSON.stringify(parsed.error.format(), null, 2);
    throw new Error(`Environment validation failed: ${formatted}`);
  }

  return parsed.data;
}
