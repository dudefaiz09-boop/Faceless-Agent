import express, { Express } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';

// Middleware
import { authMiddleware, requireAuth } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { globalErrorHandler } from './middleware/error.js';
import { enterpriseCorsMiddleware } from './middleware/cors.js';
import { idempotencyMiddleware } from './middleware/idempotency.js';
import { getCorrelationId, requestContextMiddleware } from './lib/context.js';
import { getAiRuntimeStatus } from './lib/ai.js';

// Initialize background consumers
import './features/notifications/attendance.consumer.js';

// Features (Refactored)
import studentRoutes from './features/students/student.routes.js';
import aiRoutes from './features/ai/ai.routes.js';
import { AiController } from './features/ai/ai.controller.js';

// Legacy Routes (Pending Refactor)
import authProfileRouter from './routes/auth-profile.js';
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

// 1. Security & Observability
app.use(requestContextMiddleware);
app.use(enterpriseCorsMiddleware);
app.use(
  pinoHttp({
    customProps: () => ({ correlationId: getCorrelationId() }),
  })
);
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
app.use(express.json({ limit: '1mb' }));

// 2. Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (_req, res) =>
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many requests from this IP, please try again later.',
      details: { retryAfter: res.getHeader('Retry-After') },
      correlationId: getCorrelationId(),
    }),
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
  // Simple health check that doesn't depend on any environment variables.
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

publicRouter.get('/version', (req, res) => {
  // Version info using environment variables that are usually present or safe to be null.
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
    expressAppLoaded: true,
  };

  const isReady = missing.length === 0;

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

// Apply authentication first so bootstrap routes can resolve the user's tenant seed.
protectedRouter.use(authMiddleware);
protectedRouter.use(requireAuth);
protectedRouter.use('/auth', authProfileRouter);
protectedRouter.use(tenantMiddleware);
protectedRouter.use(idempotencyMiddleware);

// 4b. Rate Limiting - Stricter for sensitive operations (inside protected router)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window for sensitive ops
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
  handler: (_req, res) =>
    res.status(429).json({
      status: 'error',
      code: 'RATE_LIMITED',
      message: 'Too many upload requests, please try again later.',
      details: { retryAfter: res.getHeader('Retry-After') },
      correlationId: getCorrelationId(),
    }),
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
