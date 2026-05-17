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

export const globalErrorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = (err as { statusCode?: number }).statusCode || 500;
  const message = (err as Error).message || 'Internal Server Error';

  // Log the error with correlation ID if available
  const correlationId = req.headers['x-correlation-id'] || 'N/A';

  logger.error(
    {
      err,
      status,
      message,
      path: req.path,
      method: req.method,
      userId: req.user?.uid || 'anonymous',
      correlationId,
    },
    'Request failed'
  );

  // Security: Don't leak stack traces in production
  const response = {
    status: 'error',
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    correlationId,
  };

  res.status(status).json(response);
};
