/**
 * Application Constants
 * Centralized configuration values used throughout the app
 */

export const AUTH_CONSTANTS = {
  /** Remember me duration in milliseconds (30 days) */
  REMEMBER_ME_DURATION_MS: 30 * 24 * 60 * 60 * 1000,
  /** Remember me duration in days */
  REMEMBER_ME_DURATION_DAYS: 30,
} as const;

export const RATE_LIMIT = {
  /** Maximum login attempts before lockout */
  MAX_ATTEMPTS: 5,
  /** Lockout duration in milliseconds (15 minutes) */
  LOCKOUT_DURATION_MS: 15 * 60 * 1000,
  /** Lockout duration in minutes */
  LOCKOUT_DURATION_MIN: 15,
  /** Window for counting failed attempts in milliseconds (5 minutes) */
  ATTEMPT_WINDOW_MS: 5 * 60 * 1000,
} as const;

export const STORAGE_KEYS = {
  /** Remember me flag */
  REMEMBER_ME: 'gimbal-remember-me',
  /** Remember me expiration timestamp */
  REMEMBER_ME_EXPIRES: 'gimbal-remember-me-expires',
  /** Login attempts prefix (append email) */
  LOGIN_ATTEMPTS: 'gimbal-login-attempts',
  /** Audit logs storage */
  AUDIT_LOGS: 'gimbal-audit-logs',
  /** Auth token storage key */
  AUTH_TOKEN: 'gimbal-auth-token',
} as const;

export const AUDIT_CONFIG = {
  /** Maximum number of logs to store locally */
  MAX_LOGS: 1000,
} as const;
