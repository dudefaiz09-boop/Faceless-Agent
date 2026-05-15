/**
 * SHARED ERROR HANDLING
 * Standardized error formats and handling logic.
 */
export var ErrorCode;
(function (ErrorCode) {
  ErrorCode['UNAUTHORIZED'] = 'UNAUTHORIZED';
  ErrorCode['FORBIDDEN'] = 'FORBIDDEN';
  ErrorCode['NOT_FOUND'] = 'NOT_FOUND';
  ErrorCode['VALIDATION_FAILED'] = 'VALIDATION_FAILED';
  ErrorCode['INTERNAL_ERROR'] = 'INTERNAL_ERROR';
  ErrorCode['NETWORK_ERROR'] = 'NETWORK_ERROR';
})(ErrorCode || (ErrorCode = {}));
export function formatError(error) {
  if (error instanceof Error) {
    if (error.message.includes('401'))
      return { code: ErrorCode.UNAUTHORIZED, message: 'Session expired. Please log in again.' };
    if (error.message.includes('403'))
      return { code: ErrorCode.FORBIDDEN, message: 'You do not have permission for this action.' };
    return { code: ErrorCode.INTERNAL_ERROR, message: error.message };
  }
  return { code: ErrorCode.INTERNAL_ERROR, message: 'An unexpected error occurred.' };
}
//# sourceMappingURL=errors.js.map
