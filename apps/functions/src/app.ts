import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as path from 'path';
import * as fs from 'fs';
import { authMiddleware } from './middleware/auth';
import { pinoHttp } from 'pino-http';
import { logger } from '@educonnect/logger';
import announcementsRouter from './routes/announcements';
import attendanceRouter from './routes/attendance';
import chatbotRouter from './routes/chatbot';
import studentsRouter from './routes/students';
import assignmentsRouter from './routes/assignments';
import libraryRouter from './routes/library';
import feesRouter from './routes/fees';
import performanceRouter from './routes/performance';
import teachersRouter from './routes/teachers';
import chatRouter from './routes/chat';

const app = express();
app.set('trust proxy', 1);

// Security, Observability and Performance Middleware
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
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
}));
app.use(compression());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
});

app.use('/api/', limiter);
app.use(authMiddleware);

// Routes
app.use('/api/announcements', announcementsRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/chatbot', chatbotRouter);
app.use('/api/students', studentsRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/library', libraryRouter);
app.use('/api/fees', feesRouter);
app.use('/api/performance', performanceRouter);
app.use('/api/teachers', teachersRouter);
import { logger } from '@educonnect/logger';
...
// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handler

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const ignore = _next; 
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error({
    err,
    status,
    message,
    path: req.path,
    method: req.method,
  }, 'Request failed');

  res.status(status).json({
    error: status === 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

export default app;
