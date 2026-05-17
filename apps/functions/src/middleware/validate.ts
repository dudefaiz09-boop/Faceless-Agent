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
        const details = error.issues
          .map((err: any) => `${err.path.join('.')}: ${err.message}`)
          .join(', ');
        return next(new AppError(`Validation failed: ${details}`, 400));
      }
      return next(error);
    }
  };
