import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './error.js';

/**
 * Zod Validation Middleware
 * Validates req.body, req.query, and req.params against a schema.
 */
export const validate =
  (schema: ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError({
            code: 'VALIDATION_ERROR',
            message: 'The request contains invalid data.',
            statusCode: 400,
            details: error.issues.map((err: any) => ({
              path: err.path.join('.'),
              message: err.message,
              code: err.code,
            })),
          })
        );
      }
      return next(error);
    }
  };
