import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';
import { ZodError } from 'zod';
import { getCorrelationId } from '../lib/context.js';

export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details: ErrorDetails;
  public readonly isOperational: boolean;
  public readonly expose: boolean;

  constructor(args: {
    code: string;
    message: string;
    statusCode: number;
    details?: ErrorDetails;
    isOperational?: boolean;
    expose?: boolean;
  });
  constructor(message: string, statusCode: number);
  constructor(
    args:
      | {
          code: string;
          message: string;
          statusCode: number;
          details?: ErrorDetails;
          isOperational?: boolean;
          expose?: boolean;
        }
      | string,
    legacyStatusCode?: number
  ) {
    const normalized =
      typeof args === 'string'
        ? {
            code: legacyStatusCode && legacyStatusCode < 500 ? 'REQUEST_ERROR' : 'INTERNAL_ERROR',
            message: args,
            statusCode: legacyStatusCode || 500,
            details: {},
            isOperational: true,
            expose: (legacyStatusCode || 500) < 500,
          }
        : {
            details: {},
            isOperational: true,
            expose: args.statusCode < 500,
            ...args,
          };

    super(normalized.message);
    this.name = 'AppError';
    this.code = normalized.code;
    this.statusCode = normalized.statusCode;
    this.details = normalized.details;
    this.isOperational = normalized.isOperational;
    this.expose = normalized.expose;

    Error.captureStackTrace(this, this.constructor);
  }
}

function normalizeError(err: unknown) {
  if (err instanceof AppError) return err;

  if (err instanceof ZodError) {
    return new AppError({
      code: 'VALIDATION_ERROR',
      message: 'The request contains invalid data.',
      statusCode: 400,
      details: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    err.name === 'SyntaxError' &&
    'body' in err
  ) {
    return new AppError({
      code: 'INVALID_JSON',
      message: 'Request body must be valid JSON.',
      statusCode: 400,
    });
  }

  if (err && typeof err === 'object') {
    const errorRecord = err as Record<string, unknown>;
    if (
      errorRecord.code ||
      (typeof errorRecord.message === 'string' && errorRecord.message.includes('Supabase'))
    ) {
      return new AppError({
        code: 'SUPABASE_ERROR',
        message: 'The data service could not complete the request.',
        statusCode: Number(errorRecord.statusCode || errorRecord.status || 500),
        details: {
          providerCode: String(errorRecord.code || ''),
        },
        expose: Number(errorRecord.statusCode || errorRecord.status || 500) < 500,
      });
    }
  }

  return new AppError({
    code: 'INTERNAL_ERROR',
    message: 'Internal Server Error',
    statusCode: 500,
    details: {},
    isOperational: false,
    expose: false,
  });
}

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const normalized = normalizeError(err);
  const status = normalized.statusCode;
  const correlationId =
    getCorrelationId() ||
    (req.headers['x-correlation-id'] as string) ||
    Math.random().toString(36).substring(2, 15);

  const safeMessage =
    normalized.expose || process.env.NODE_ENV !== 'production'
      ? normalized.message
      : 'Internal Server Error';

  logger.error(
    {
      err,
      status,
      code: normalized.code,
      message: normalized.message,
      path: req.path,
      method: req.method,
      userId: req.user?.uid || 'anonymous',
      tenantId: req.tenantId,
      correlationId,
    },
    'Request failed'
  );

  const response = {
    status: 'error',
    code: normalized.code,
    message: safeMessage,
    details: normalized.details || {},
    correlationId,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.setHeader('x-correlation-id', correlationId);
  res.status(status).json(response);
};
