import type { IncomingMessage, ServerResponse } from 'node:http';

type ExpressApp = (
  req: IncomingMessage,
  res: ServerResponse,
  next?: (error?: unknown) => void
) => void;

let appPromise: Promise<ExpressApp> | null = null;
let lastStartupError: unknown = null;

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const allowedHeaders = 'Authorization,Content-Type,x-school-id,x-correlation-id';
const protectedPrefixes = [
  '/api/notifications',
  '/api/announcements',
  '/api/attendance',
  '/api/assignments',
  '/api/library',
  '/api/fees',
  '/api/performance',
  '/api/teachers',
  '/api/chat',
  '/api/users',
  '/api/students',
];

function isAllowedOrigin(origin: string) {
  const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredOrigins.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

function applyCorsHeaders(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers.origin;
  if (typeof origin !== 'string' || !isAllowedOrigin(origin)) return;

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    String(req.headers['access-control-request-headers'] || allowedHeaders)
  );
  res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id');
}

function sendJson(res: ServerResponse, statusCode: number, body: Record<string, unknown>) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

function getPath(req: IncomingMessage) {
  const host = req.headers.host || 'localhost';
  return new URL(req.url || '/', `https://${host}`).pathname;
}

function getStartupErrorMessage(error: unknown) {
  if (!error) return null;
  if (error instanceof Error) return error.message;
  return String(error);
}

async function loadApp() {
  if (!appPromise) {
    appPromise = import('../apps/functions/src/app.ts')
      .then((module) => {
        lastStartupError = null;
        return module.default as ExpressApp;
      })
      .catch((error) => {
        lastStartupError = error;
        appPromise = null;
        throw error;
      });
  }

  return appPromise;
}

function handleFallback(req: IncomingMessage, res: ServerResponse) {
  const path = getPath(req);
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS'].filter(
    (name) => !process.env[name]
  );
  const startupError = getStartupErrorMessage(lastStartupError);

  if (req.method === 'GET' && path === '/api/version') {
    return sendJson(res, 200, {
      status: 'ok',
      app: 'educonnect-api',
      degraded: true,
      startupError,
      gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
      vercelUrl: process.env.VERCEL_URL || null,
      nodeEnv: process.env.NODE_ENV || null,
      corsOrigins: process.env.CORS_ORIGINS || null,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && path === '/api/health') {
    return sendJson(res, 200, {
      status: 'healthy',
      degraded: true,
      startupError,
      timestamp: new Date().toISOString(),
    });
  }

  if (req.method === 'GET' && path === '/api/ready') {
    return sendJson(res, 503, {
      status: 'not_ready',
      environment: process.env.NODE_ENV || 'development',
      nodeEnv: process.env.NODE_ENV || null,
      vercelUrl: process.env.VERCEL_URL || null,
      runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
      checks: {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasCorsOrigins: !!process.env.CORS_ORIGINS,
        hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
        hasOpenRouterModel: !!process.env.OPENROUTER_MODEL,
        supabaseDocumentsReachable: false,
        expressAppLoaded: false,
      },
      missing,
      startupError,
      timestamp: new Date().toISOString(),
    });
  }

  if (protectedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      return sendJson(res, 401, {
        error: 'Unauthorized',
        message: 'Authentication required',
        startupError,
      });
    }
  }

  return sendJson(res, 503, {
    status: 'not_ready',
    error: 'API_STARTUP_FAILED',
    message: 'The API app could not be loaded. Check Vercel function logs.',
    startupError,
    timestamp: new Date().toISOString(),
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  applyCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    const app = await loadApp();
    return app(req, res);
  } catch (error) {
    console.error('[api/index] Failed to load Express app source:', error);
    return handleFallback(req, res);
  }
}
