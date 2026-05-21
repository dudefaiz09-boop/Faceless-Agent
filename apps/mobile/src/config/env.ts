/**
 * Mobile environment config.
 *
 * process.env.VAR literals are replaced by babel-plugin-transform-inline-environment-variables
 * at bundle time. Keep these as direct process.env.NAME reads so CI values are baked into the APK.
 */

interface EnvConfig {
  API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  IS_PRODUCTION: boolean;
}

export interface MobileConfigIssue {
  name: keyof Pick<EnvConfig, 'API_BASE_URL' | 'SUPABASE_URL' | 'SUPABASE_ANON_KEY'>;
  message: string;
}

const IS_REACT_NATIVE_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

const PRODUCTION_CONFIG: EnvConfig = {
  API_BASE_URL: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  IS_PRODUCTION: true,
};

const DEV_CONFIG: EnvConfig = {
  API_BASE_URL: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  IS_PRODUCTION: false,
};

export const ENV = IS_REACT_NATIVE_DEV ? DEV_CONFIG : PRODUCTION_CONFIG;

export function isLocalhostUrl(value: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(value);
}

export function isHttpsUrl(value: string) {
  return /^https:\/\/[^/]+/i.test(value);
}

export function validateMobileConfig(config: EnvConfig): MobileConfigIssue[] {
  const issues: MobileConfigIssue[] = [];

  if (!config.SUPABASE_URL) {
    issues.push({ name: 'SUPABASE_URL', message: 'Supabase project URL is missing.' });
  } else if (!isHttpsUrl(config.SUPABASE_URL)) {
    issues.push({ name: 'SUPABASE_URL', message: 'Supabase URL must use HTTPS.' });
  }

  if (!config.SUPABASE_ANON_KEY) {
    issues.push({ name: 'SUPABASE_ANON_KEY', message: 'Supabase anon key is missing.' });
  } else if (/service[_-]?role/i.test(config.SUPABASE_ANON_KEY)) {
    issues.push({
      name: 'SUPABASE_ANON_KEY',
      message: 'Service role keys must never be bundled into the mobile app.',
    });
  }

  if (!config.API_BASE_URL) {
    issues.push({ name: 'API_BASE_URL', message: 'Public API base URL is missing.' });
  } else if (config.IS_PRODUCTION && !isHttpsUrl(config.API_BASE_URL)) {
    issues.push({ name: 'API_BASE_URL', message: 'Packaged APK API URL must use HTTPS.' });
  } else if (config.IS_PRODUCTION && isLocalhostUrl(config.API_BASE_URL)) {
    issues.push({ name: 'API_BASE_URL', message: 'Packaged APK API URL cannot be localhost.' });
  }

  return issues;
}

export const mobileConfigIssues = validateMobileConfig(ENV);
export const mobileConfigReady = mobileConfigIssues.length === 0;

if (IS_REACT_NATIVE_DEV) {
  console.log('[Mobile] ENV mode: DEV. API:', ENV.API_BASE_URL);
  console.log('[Mobile] Supabase URL:', ENV.SUPABASE_URL);
} else if (!mobileConfigReady) {
  console.error(
    '[EduConnect] Mobile build is missing required public config: ' +
      mobileConfigIssues.map((issue) => issue.name).join(', ')
  );
}
