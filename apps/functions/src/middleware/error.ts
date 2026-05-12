import { Request, Response, NextFunction } from 'express';
import { logger } from '@educonnect/logger';

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
 * Must have exactly 4 parameters (err, req, res, next) for Express to recognize it as an error handler
 */
export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with correlation ID if available
  const correlationId = req.headers['x-correlation-id'] || 'N/A';
  
  logger.error({
    err,
    status,
    message,
    path: req.path,
    method: req.method,
    correlationId,
    stack: err.stack
  }, 'Request failed');

  // Security: Don't leak stack traces in production
  const response = {
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    correlationId
  };

  res.status(status).json(response);
};
