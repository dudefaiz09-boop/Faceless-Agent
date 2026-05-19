import express, { Express } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';

// Middleware
import { authMiddleware, requireAuth } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { globalErrorHandler } from './middleware/error.js';
import { getAiRuntimeStatus } from './lib/ai.js';

// Initialize background consumers
import './features/notifications/attendance.consumer.js';

// Features (Refactored)
import studentRoutes from './features/students/student.routes.js';
import aiRoutes from './features/ai/ai.routes.js';
import { AiController } from './features/ai/ai.controller.js';
import { getSupabaseAdmin } from './lib/supabase.js';

// Legacy Routes (Pending Refactor)
import announcementsRouter from './routes/announcements.js';
import attendanceRouter from './routes/attendance.js';
import assignmentsRouter from './routes/assignments.js';
import libraryRouter from './routes/library.js';
import feesRouter from './routes/fees.js';
import performanceRouter from './routes/performance.js';
import teachersRouter from './routes/teachers.js';
import chatRouter from './routes/chat.js';
import rolesRouter from './routes/roles.js';
import usersRouter from './routes/users.js';
import notificationsRouter from './routes/notifications.js';

const app: Express = express();
app.set('trust proxy', 1);

const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function isAllowedOrigin(origin: string) {
  if (configuredOrigins.includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  return false;
}

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const defaultAllowedHeaders = 'Authorization,Content-Type,x-school-id,x-correlation-id';

function getAllowedOrigin(origin?: string) {
  if (!origin) return null;
  if (isAllowedOrigin(origin)) return origin;
  return null;
}

function applyCorsHeaders(req: express.Request, res: express.Response) {
  const origin = req.headers.origin;
  const allowedOrigin = getAllowedOrigin(origin as string);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader(
      'Access-Control-Allow-Headers',
      String(req.headers['access-control-request-headers'] || defaultAllowedHeaders)
    );
    res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id');
  }
}

// 1. Security & Observability
app.use((req, res, next) => {
  applyCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  return next();
});

app.use(pinoHttp({ logger: logger as any }));

const corsOptions = {
  credentials: true,
  origin(origin: any, callback: any) {
    if (!origin || isAllowedOrigin(origin)) return callback(null, true);
    return callback(null, false);
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-school-id', 'x-correlation-id'],
  exposedHeaders: ['x-correlation-id'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          'https://apis.google.com',
          'https://*.googleapis.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://*.googleapis.com',
        ],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://*.supabase.co',
          'https://*.supabase.in',
          'https://*.googleusercontent.com',
          'https://*.googleapis.com',
        ],
        connectSrc: [
          "'self'",
          'https://*.supabase.co',
          'https://*.supabase.in',
          'https://*.vercel.app',
          'https://*.onrender.com',
          'https://*.koyeb.app',
          'wss://*.supabase.co',
          'wss://*.supabase.in',
          'https://*.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://*.gstatic.com'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(compression());
app.use(express.json());

// 2. Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
app.use('/api/', limiter);

// 3. Public Router
const publicRouter = express.Router();
publicRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'EduConnect API is running.',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
publicRouter.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

publicRouter.get('/version', (req, res) => {
  res.json({
    status: 'ok',
    app: 'educonnect-api',
    gitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
    vercelUrl: process.env.VERCEL_URL || null,
    nodeEnv: process.env.NODE_ENV || null,
    corsOrigins: process.env.CORS_ORIGINS || null,
    timestamp: new Date().toISOString(),
  });
});

// Safe public AI endpoints. These never expose the OpenRouter key.
publicRouter.get('/ai/status', AiController.getStatus);
publicRouter.post('/ai/query', AiController.publicQueryChatbot);

publicRouter.get('/ready', async (req, res) => {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'CORS_ORIGINS'].filter(
    (name) => !process.env[name]
  );

  const checks = {
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasCorsOrigins: !!process.env.CORS_ORIGINS,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasOpenRouterModel: !!process.env.OPENROUTER_MODEL,
    supabaseDocumentsReachable: false,
  };

  if (checks.hasSupabaseUrl && checks.hasServiceRoleKey) {
    try {
      const supabaseAdmin = getSupabaseAdmin();
      const { error } = await supabaseAdmin
        .from('documents')
        .select('id', { head: true, count: 'exact' })
        .limit(1);
      checks.supabaseDocumentsReachable = !error;
    } catch (err) {
      logger.warn({ err }, 'Supabase connectivity check failed inside /ready');
    }
  }

  const isReady = missing.length === 0 && checks.supabaseDocumentsReachable;

  return res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    environment: process.env.NODE_ENV || 'development',
    nodeEnv: process.env.NODE_ENV || null,
    vercelUrl: process.env.VERCEL_URL || null,
    runtime: process.env.VERCEL_URL ? 'vercel' : 'local',
    checks,
    missing,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', publicRouter);

// 4. Protected Router
const protectedRouter = express.Router();

// Apply authentication and tenancy middlewares to all protected routes
protectedRouter.use(authMiddleware);
protectedRouter.use(requireAuth);
protectedRouter.use(tenantMiddleware);

// 4b. Rate Limiting - Stricter for sensitive operations (inside protected router)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window for sensitive ops
  message: { error: 'Too many upload requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});

protectedRouter.use('/fees/upload', sensitiveLimiter);
protectedRouter.use('/performance/upload', sensitiveLimiter);

// Feature Routes
protectedRouter.use('/students', studentRoutes);
protectedRouter.use('/ai', aiRoutes);

// Legacy Routes
protectedRouter.use('/announcements', announcementsRouter);
protectedRouter.use('/attendance', attendanceRouter);
protectedRouter.use('/assignments', assignmentsRouter);
protectedRouter.use('/library', libraryRouter);
protectedRouter.use('/fees', feesRouter);
protectedRouter.use('/performance', performanceRouter);
protectedRouter.use('/teachers', teachersRouter);
protectedRouter.use('/chat', chatRouter);
protectedRouter.use('/roles', rolesRouter);
protectedRouter.use('/users', usersRouter);
protectedRouter.use('/notifications', notificationsRouter);

app.use('/api', protectedRouter);

// 5. Global Error Handling (MUST be last)
app.use(globalErrorHandler);

// Startup logs for environment diagnostics
logger.info(getAiRuntimeStatus(), 'AI Environment Diagnostic');

export default app;
