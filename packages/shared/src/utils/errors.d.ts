/**
 * SHARED ERROR HANDLING
 * Standardized error formats and handling logic.
 */
export declare enum ErrorCode {
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
  data?: any;
}
export declare function formatError(error: any): AppError;
