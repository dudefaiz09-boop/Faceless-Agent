import { Platform } from 'react-native';

declare const process:
  | {
      env: Record<string, string | undefined>;
    }
  | undefined;

/**
 * PRODUCTION-GRADE MOBILE ENVIRONMENT CONFIG
 *
 * Handles switching between staging, production, and local development.
 */

interface EnvConfig {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  IS_PRODUCTION: boolean;
}

const PRODUCTION_CONFIG: EnvConfig = {
  API_BASE_URL: process.env.API_BASE_URL || 'https://your-api.example.com/api',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
  IS_PRODUCTION: true,
};

const DEV_CONFIG: EnvConfig = {
  // Use local emulator IP for Android/iOS
  API_BASE_URL: Platform.select({
    android: 'http://10.0.2.2:8080/api',
    ios: 'http://localhost:8080/api',
    default: 'http://localhost:8080/api',
  })!,
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || 'your_supabase_anon_key',
  IS_PRODUCTION: false,
};

export const ENV = __DEV__ ? DEV_CONFIG : PRODUCTION_CONFIG;

// Log active environment in dev
if (__DEV__) {
  console.log('[Mobile] Running in DEV mode. API:', ENV.API_BASE_URL);
}
