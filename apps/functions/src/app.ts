import express, { Express, Request, Response, NextFunction } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';

// Middleware
import { authMiddleware } from './middleware/auth.js';
import { globalErrorHandler } from './middleware/error.js';

// Features (Refactored)
import studentRoutes from './features/students/student.routes.js';
import aiRoutes from './features/ai/ai.routes.js';

// Legacy Routes (Pending Refactor)
import announcementsRouter from './routes/announcements.js';
import attendanceRouter from './routes/attendance.js';
import assignmentsRouter from './routes/assignments.js';
import libraryRouter from './routes/library.js';
import feesRouter from './routes/fees.js';
import performanceRouter from './routes/performance.js';
import teachersRouter from './routes/teachers.js';
import chatRouter from './routes/chat.js';

const app: Express = express();
app.set('trust proxy', 1);

// 1. Security & Observability
app.use(pinoHttp({ logger }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://*.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://*.googleusercontent.com", "https://*.googleapis.com", "https://*.firebase.com"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://*.firebaseio.com", "https://*.cloudfunctions.net", "https://*.firebase.com", "wss://*.firebaseio.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://*.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

app.use(compression());
app.use(express.json());

// 2. Rate Limiting - Stricter limits for sensitive operations
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Reduced from 500 to 100 for better security
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // Stricter limit for sensitive operations
  message: { error: 'Too many requests for this operation.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// 3. Authentication
app.use(authMiddleware);

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

// 6. Strict rate limiting for sensitive endpoints
app.post('/api/fees/upload', strictLimiter);
app.post('/api/fees/pay', strictLimiter);
app.post('/api/performance/upload', strictLimiter);

// 7. Health Check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 8. Global Error Handling (MUST be last middleware)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  globalErrorHandler(err, req, res, next);
});

export default app;
