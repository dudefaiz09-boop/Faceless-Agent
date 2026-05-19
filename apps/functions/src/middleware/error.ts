/**
 * Centralized AppError class for operational errors.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Error Handler Middleware
 * IMPORTANT: Must have exactly 4 parameters for Express to recognize as error handler
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with correlation ID if available
  const correlationId =
    (req.headers['x-correlation-id'] as string) || Math.random().toString(36).substring(2, 15);

  logger.error(
    {
      err,
      status,
      message,
      path: req.path,
      method: req.method,
      userId: (req as any).user?.uid || 'anonymous',
      correlationId,
    },
    'Request failed'
  );

  // Security: Don't leak stack traces in production
  const response = {
    status: 'error',
    error: err.name || 'InternalError',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    correlationId,
  };

  // Add correlation ID to response headers
  res.setHeader('x-correlation-id', correlationId);

  res.status(status).json(response);
};
