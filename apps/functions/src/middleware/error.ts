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
 * 
 * Must be registered as the last middleware in Express.
 * Requires exactly 4 parameters (err, req, res, next) for Express to recognize it as an error handler.
 */
import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';

export const globalErrorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  // Determine status code
  const status = err?.statusCode || (err?.status) || 500;
  const message = err?.message || 'Internal Server Error';

  // Extract correlation ID for request tracing
  const correlationId = req.headers['x-correlation-id'] || 'N/A';
  
  // Log error with full context
  logger.error({
    err,
    status,
    message,
    path: req.path,
    method: req.method,
    correlationId,
    userId: (req as any).user?.uid || 'anonymous'
  }, `Request failed: ${method} ${req.path}`);

  // Security: Don't leak sensitive information in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  const response = {
    status: 'error',
    message,
    ...(isDevelopment && { stack: err?.stack }),
    correlationId
  };

  // Set appropriate status code
  const statusCode = typeof status === 'number' && status >= 400 ? status : 500;

  res.status(statusCode).json(response);
};
