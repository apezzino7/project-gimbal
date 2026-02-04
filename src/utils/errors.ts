/**
 * Custom Error Classes
 * Provides typed error handling throughout the application
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  code: string;
  statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends AppError {
  remainingTime: number;

  constructor(remainingTime: number) {
    super(
      `Account locked. Try again in ${remainingTime} minutes.`,
      'RATE_LIMIT',
      429
    );
    this.name = 'RateLimitError';
    this.remainingTime = remainingTime;
  }
}

/**
 * Validation errors
 */
export class ValidationError extends AppError {
  field?: string;

  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends AppError {
  constructor(message: string = 'Network error. Please check your connection.') {
    super(message, 'NETWORK_ERROR', 503);
    this.name = 'NetworkError';
  }
}

/**
 * Extract a user-friendly error message from any error type
 */
export function handleError(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Handle Supabase errors
    if ('code' in error && typeof (error as { code: unknown }).code === 'string') {
      const code = (error as { code: string }).code;
      switch (code) {
        case 'invalid_credentials':
          return 'Invalid email or password';
        case 'email_not_confirmed':
          return 'Please verify your email address';
        case 'user_not_found':
          return 'No account found with this email';
        default:
          return error.message;
      }
    }
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
