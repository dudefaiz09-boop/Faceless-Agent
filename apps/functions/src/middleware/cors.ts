import type { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { getCorrelationId } from '../lib/context.js';

const allowedMethods = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const defaultAllowedHeaders =
  'Authorization,Content-Type,x-school-id,x-correlation-id,x-idempotency-key';

function configuredOrigins() {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isAllowedOrigin(origin: string) {
  if (configuredOrigins().includes(origin)) return true;
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin)) return true;
  if (process.env.ALLOW_VERCEL_PREVIEW_ORIGINS !== 'false') {
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return true;
  }
  return false;
}

export function enterpriseCorsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (!origin) {
    if (req.method === 'OPTIONS') return res.status(204).end();
    return next();
  }

  if (typeof origin !== 'string' || !isAllowedOrigin(origin)) {
    logger.warn(
      {
        origin,
        path: req.path,
        method: req.method,
        correlationId: getCorrelationId(),
      },
      'Rejected CORS origin'
    );

    if (req.method === 'OPTIONS') {
      return res.status(403).json({
        status: 'error',
        code: 'CORS_ORIGIN_DENIED',
        message: 'Origin is not allowed for this API.',
        details: {},
        correlationId: getCorrelationId(),
      });
    }

    return next();
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    String(req.headers['access-control-request-headers'] || defaultAllowedHeaders)
  );
  res.setHeader('Access-Control-Expose-Headers', 'x-correlation-id');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  return next();
}
