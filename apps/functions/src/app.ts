import express, { Express } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';

// Middleware
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { globalErrorHandler } from './middleware/error.js';

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
        return;
      }

      callback(new Error(`CORS blocked origin: ${origin}`));
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

// Create a separate router for public endpoints
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
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      return res.status(503).json({
        status: 'not_ready',
        message: 'Missing required environment variables',
        missing: missingVars,
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
      environment: process.env.NODE_ENV || 'development',
      features: {
        ai: !!process.env.OPENROUTER_API_KEY,
        uploads: !!process.env.SUPABASE_UPLOADS_BUCKET,
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      message: 'Service connectivity check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api', publicRouter);

// 2b. Rate Limiting - Stricter for sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per window for sensitive ops
  message: { error: 'Too many upload requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/fees/upload', sensitiveLimiter);
app.use('/api/performance/upload', sensitiveLimiter);

// 3. Authentication & Tenancy
app.use(authMiddleware);
app.use(tenantMiddleware);

// 4. Feature Routes
app.use('/api/students', studentRoutes);
app.use('/api/ai', aiRoutes);

// 5. Legacy Routes
app.use('/api/announcements', announcementsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/fees', feesRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/teachers', teachersRouter);
app.use('/api/chat', chatRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/users', usersRouter);
app.use('/api/notifications', notificationsRouter);

// 6. Global Error Handling (MUST be last)
app.use(globalErrorHandler);

export default app;
