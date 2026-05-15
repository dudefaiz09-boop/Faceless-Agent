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

  // Application configuration
  PUBLIC_APP_URL: z.string().optional(),
  CURRENCY: z.string().default('INR'),
});

/**
 * Validates and returns the environment configuration.
 * Fails fast if required variables are missing.
 */
function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      '❌ Invalid environment variables:',
      JSON.stringify(parsed.error.format(), null, 2)
    );

    // In production, we must crash if secrets are missing
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL: Environment validation failed. Stopping process.');
    }
  }

  return parsed.data || process.env;
}

export const env = validateEnv() as z.infer<typeof envSchema>;
