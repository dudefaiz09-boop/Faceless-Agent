/**
 * SHARED ERROR HANDLING
 * Standardized error formats and handling logic.
 */

export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  status?: number;
  details?: any;
}

export function formatError(error: any): AppError {
  // If it's already an AppError, return it
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as AppError;
  }

  // Handle ApiClient error objects
  if (error?.status) {
    return {
      code:
        error.status === 401
          ? ErrorCode.UNAUTHORIZED
          : error.status === 400
            ? ErrorCode.VALIDATION_FAILED
            : ErrorCode.INTERNAL_ERROR,
      message: error.message || 'Request failed',
      status: error.status,
      details: error.data,
    };
  }

  if (error instanceof Error) {
    if (error.message.includes('401'))
      return {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Session expired. Please log in again.',
        status: 401,
      };
    if (error.message.includes('403'))
      return {
        code: ErrorCode.FORBIDDEN,
        message: 'You do not have permission for this action.',
        status: 403,
      };
    return { code: ErrorCode.INTERNAL_ERROR, message: error.message };
  }

  return { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred.' };
}
