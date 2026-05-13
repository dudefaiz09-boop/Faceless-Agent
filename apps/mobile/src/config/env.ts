import { Platform } from 'react-native';

/**
 * PRODUCTION-GRADE MOBILE ENVIRONMENT CONFIG
 * 
 * Handles switching between staging, production, and local development.
 */

interface EnvConfig {
  API_BASE_URL: string;
  FIREBASE_PROJECT_ID: string;
  IS_PRODUCTION: boolean;
}

const STAGING_CONFIG: EnvConfig = {
  API_BASE_URL: 'https://us-central1-educonnect-staging.cloudfunctions.net/api',
  FIREBASE_PROJECT_ID: 'educonnect-staging',
  IS_PRODUCTION: false,
};

const PRODUCTION_CONFIG: EnvConfig = {
  API_BASE_URL: 'https://us-central1-gen-lang-client-0979500227.cloudfunctions.net/api',
  FIREBASE_PROJECT_ID: 'gen-lang-client-0979500227',
  IS_PRODUCTION: true,
};

const DEV_CONFIG: EnvConfig = {
  // Use local emulator IP for Android/iOS
  API_BASE_URL: Platform.select({
    android: 'http://10.0.2.2:5001/gen-lang-client-0979500227/us-central1/api',
    ios: 'http://localhost:5001/gen-lang-client-0979500227/us-central1/api',
    default: 'http://localhost:5001/gen-lang-client-0979500227/us-central1/api',
  })!,
  FIREBASE_PROJECT_ID: 'gen-lang-client-0979500227',
  IS_PRODUCTION: false,
};

export const ENV = __DEV__ ? DEV_CONFIG : PRODUCTION_CONFIG;

// Log active environment in dev
if (__DEV__) {
  console.log('[Mobile] Running in DEV mode. API:', ENV.API_BASE_URL);
}
