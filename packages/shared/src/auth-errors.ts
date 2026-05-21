/**
 * Standardized mapping of Supabase Auth error messages to user-friendly strings.
 */
export function getAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred';
  
  // Safely extract the message from the error object
  const message = 
    typeof error === 'object' && error !== null && 'message' in error 
      ? String((error as any).message) 
      : String(error);
  
  if (message.includes('Invalid login credentials')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('Email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('User not found')) {
    return 'No account found with this email.';
  }
  if (message.includes('Password is too short')) {
    return 'Password must be at least 6 characters.';
  }
  if (message.includes('Rate limit') || message.includes('too_many_requests')) {
    return 'Too many attempts. Please try again later.';
  }

  return message;
}