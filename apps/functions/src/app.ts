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
import { getAiRuntimeStatus, isAiEnabled } from './lib/ai.js';

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

// 1. Security & Observability
app.use(pinoHttp({ logger: logger as any }));
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
  })
);

// Explicitly handle preflight requests
app.options(
  '*',
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
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
app.use(express.json());

// 2. Rate Limiting - General
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
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

// Safe public AI endpoints. These never expose the OpenRouter key.
publicRouter.get('/ai/status', AiController.getStatus);
publicRouter.post('/ai/query', AiController.publicQueryChatbot);

publicRouter.get('/ready', async (req, res) => {
  try {
    // Check required environment variables
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const envStatus: Record<string, boolean> = {};
    const missingVars = [];

    for (const v of requiredEnvVars) {
      const exists = !!process.env[v];
      envStatus[v] = exists;
      if (!exists) missingVars.push(v);
    }

    if (missingVars.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        message: 'Missing required environment variables',
        env: {
          ...envStatus,
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          hasCorsOrigins: !!process.env.CORS_ORIGINS,
          nodeEnv: process.env.NODE_ENV || 'development',
          vercelUrl: process.env.VERCEL_URL || null,
          runtime: 'nodejs',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check Supabase connectivity (best-effort, no secrets exposed)
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('documents').select('id', { head: true }).limit(1);

    if (error) {
      throw error;
    }

    res.json({
      status: 'ready',
      env: {
        hasSupabaseUrl: true,
        hasServiceRoleKey: true,
        hasCorsOrigins: !!process.env.CORS_ORIGINS,
        nodeEnv: process.env.NODE_ENV || 'development',
        vercelUrl: process.env.VERCEL_URL || null,
        runtime: 'nodejs',
      },
      features: {
        ai: isAiEnabled(),
        uploads: !!process.env.SUPABASE_UPLOADS_BUCKET,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    logger.error({ err }, 'Ready check failed');
    res.status(503).json({
      status: 'not_ready',
      message: 'Service connectivity check failed',
      error: process.env.NODE_ENV !== 'production' ? err.message : 'Connectivity error',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api', publicRouter);

// 4. Rate Limiting - Stricter for sensitive operations (placed BEFORE protectedRouter)
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window for sensitive ops
  message: { error: 'Too many upload requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/fees/upload', sensitiveLimiter);
app.use('/api/performance/upload', sensitiveLimiter);

// 5. Protected Router
const protectedRouter = express.Router();

// Apply authentication and tenancy middlewares to all protected routes
protectedRouter.use(authMiddleware);
protectedRouter.use(requireAuth);
protectedRouter.use(tenantMiddleware);

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

// 6. Global Error Handling (MUST be last)
app.use(globalErrorHandler);

// Startup logs for environment diagnostics
logger.info(getAiRuntimeStatus(), 'AI Environment Diagnostic');

export default app;
