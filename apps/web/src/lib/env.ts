import { z } from 'zod';

const DEFAULT_API_BASE_URL = '/api';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url('VITE_SUPABASE_URL must be a valid Supabase project URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'VITE_SUPABASE_ANON_KEY is required'),
  VITE_SUPABASE_UPLOADS_BUCKET: z.string().min(1).default('educonnect-uploads'),
  VITE_API_BASE_URL: z
    .string()
    .min(1, 'VITE_API_BASE_URL is required')
    .default(DEFAULT_API_BASE_URL),
  VITE_ENABLE_AI_FEATURES: z.string().default('true'),
  VITE_ENVIRONMENT: z.string().default('development'),
  VITE_DEMO_MODE: z.string().default('false'),
});

export type WebEnv = z.infer<typeof envSchema>;

function getRawEnvValue(name: keyof WebEnv) {
  return (import.meta.env[name] || '').trim();
}

function isRelativeApiBaseUrl(value: string) {
  return value.startsWith('/');
}

function isLocalBrowserOrigin() {
  if (typeof window === 'undefined') return false;
  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

function shouldWarnAboutRelativeApiBaseUrl(apiBaseUrl: string) {
  return import.meta.env.PROD && isRelativeApiBaseUrl(apiBaseUrl) && !isLocalBrowserOrigin();
}

export function getApiBaseUrlDiagnostic(apiBaseUrl = env.VITE_API_BASE_URL) {
  const trimmed = apiBaseUrl.trim();
  if (!trimmed) return '(missing)';

  try {
    const runtimeOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://web-origin.example';
    const parsed = new URL(trimmed, runtimeOrigin);
    parsed.username = '';
    parsed.password = '';
    parsed.search = '';
    parsed.hash = '';
    return isRelativeApiBaseUrl(trimmed) ? parsed.pathname : parsed.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/[?#].*$/, '');
  }
}

function validateApiBaseUrlForRuntime(env: WebEnv): WebEnv {
  const apiBaseUrl = env.VITE_API_BASE_URL.trim();
  const rawApiBaseUrl = getRawEnvValue('VITE_API_BASE_URL');

  if (!apiBaseUrl) {
    throw new Error('Invalid web environment configuration:\nVITE_API_BASE_URL is required');
  }

  if (
    import.meta.env.PROD &&
    !rawApiBaseUrl &&
    env.VITE_ENVIRONMENT !== 'preview' &&
    env.VITE_DEMO_MODE !== 'true'
  ) {
    throw new Error(
      'Invalid web environment configuration:\nVITE_API_BASE_URL must be explicitly configured for production builds.'
    );
  }

  if (shouldWarnAboutRelativeApiBaseUrl(apiBaseUrl)) {
    const reason = rawApiBaseUrl
      ? `configured as ${getApiBaseUrlDiagnostic(apiBaseUrl)}`
      : `missing and defaulted to ${DEFAULT_API_BASE_URL}`;

    console.warn(
      `[WebEnv] VITE_API_BASE_URL is ${reason} in a production build. ` +
        'Relative /api only works when the API is served from the same origin as the web app. ' +
        'For the separate EduConnect API Vercel project, set ' +
        'VITE_API_BASE_URL=https://educonnect-api-sigma.vercel.app/api and redeploy the web app.'
    );
  }

  return {
    ...env,
    VITE_API_BASE_URL: apiBaseUrl,
  };
}

function parseEnv(): WebEnv {
  const parsed = envSchema.safeParse(import.meta.env);
  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('\n');
    throw new Error(`Invalid web environment configuration:\n${message}`);
  }
  return validateApiBaseUrlForRuntime(parsed.data);
}

export const env = parseEnv();
