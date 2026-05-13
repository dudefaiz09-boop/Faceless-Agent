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
  details?: any;
}

export function formatError(error: any): AppError {
  if (error instanceof Error) {
    if (error.message.includes('401'))
      return { code: ErrorCode.UNAUTHORIZED, message: 'Session expired. Please log in again.' };
    if (error.message.includes('403'))
      return { code: ErrorCode.FORBIDDEN, message: 'You do not have permission for this action.' };
    return { code: ErrorCode.INTERNAL_ERROR, message: error.message };
  }
  return { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred.' };
}
