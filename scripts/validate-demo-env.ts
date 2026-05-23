import { config } from 'dotenv';

config();

function get(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function warn(message: string) {
  console.warn(`[warn] ${message}`);
}

const failures: string[] = [];

function error(message: string) {
  console.error(`[error] ${message}`);
  failures.push(message);
}

// Load variables
const supabaseUrlApi = get('SUPABASE_URL');
const supabaseUrlWeb = get('VITE_SUPABASE_URL');
// Mobile uses SUPABASE_URL too
const supabaseUrlMobile = supabaseUrlApi;

const supabaseAnonKeyApi = get('SUPABASE_ANON_KEY');
const supabaseAnonKeyWeb = get('VITE_SUPABASE_ANON_KEY');
const supabaseServiceRole = get('SUPABASE_SERVICE_ROLE_KEY');

const apiBaseUrlWeb = get('VITE_API_BASE_URL');
const apiBaseUrlMobile = get('API_BASE_URL');
const corsOrigins = get('CORS_ORIGINS');

function assertPresent(value: string | undefined, label: string) {
  if (!value) {
    error(`${label} is missing`);
  }
}

// Check required variables
assertPresent(supabaseUrlApi || supabaseUrlWeb, 'SUPABASE_URL/VITE_SUPABASE_URL');
assertPresent(supabaseAnonKeyApi || supabaseAnonKeyWeb, 'SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY');
assertPresent(apiBaseUrlWeb || apiBaseUrlMobile, 'VITE_API_BASE_URL/API_BASE_URL');
assertPresent(supabaseServiceRole, 'SUPABASE_SERVICE_ROLE_KEY');
assertPresent(corsOrigins, 'CORS_ORIGINS');

// Cross-check Supabase URL across API and web
if (supabaseUrlApi && supabaseUrlWeb && supabaseUrlApi !== supabaseUrlWeb) {
  warn(`Supabase URL mismatch: API=${supabaseUrlApi}, Web=${supabaseUrlWeb}`);
}

// Cross-check API base URL across web and mobile
if (apiBaseUrlWeb && apiBaseUrlMobile && apiBaseUrlWeb !== apiBaseUrlMobile) {
  warn(`API base URL mismatch: Web=${apiBaseUrlWeb}, Mobile=${apiBaseUrlMobile}`);
}

// Production checks
const nodeEnv = get('NODE_ENV') || get('VITE_ENVIRONMENT') || 'development';
if (nodeEnv === 'production') {
  if (apiBaseUrlWeb && apiBaseUrlWeb.startsWith('/')) {
    error('VITE_API_BASE_URL must be an absolute URL in production.');
  }
  // prettier-ignore
if (apiBaseUrlMobile && (apiBaseUrlMobile.includes('localhost') || apiBaseUrlMobile.includes('127.0.0.1'))) {
    
error('API_BASE_URL must not point to localhost/127.0.0.1 for mobile builds.');
  }
}

// Check service role exposure
if (supabaseServiceRole && (supabaseAnonKeyApi === supabaseServiceRole || supabaseAnonKeyWeb === supabaseServiceRole)) {
  error('Supabase service role key must not be used as the anon key.');
}

// Report
if (failures.length > 0) {
  console.error('Environment validation failed with the following issues:');
  for (const f of failures) {
    console.error(` - ${f}`);
  }
  process.exit(1);
} else {
  console.log('Environment validation passed.');
}
