/**
 * Remember Me utility
 * Manages 30-day "Remember Me" session preference
 */

import { STORAGE_KEYS } from '../constants/app';

/**
 * Check if "Remember Me" is active and not expired
 */
export function isRememberMeActive(): boolean {
  try {
    const rememberMe = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
    const expiresAt = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);

    if (!rememberMe || rememberMe !== 'true') {
      return false;
    }

    if (!expiresAt) {
      return false;
    }

    const expirationTime = parseInt(expiresAt, 10);
    const now = Date.now();

    // Check if expired
    if (now > expirationTime) {
      clearRememberMe();
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Clear Remember Me preference
 */
export function clearRememberMe(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);
  } catch (error) {
    console.error('Failed to clear remember me preference:', error);
  }
}

/**
 * Get remaining days for Remember Me
 */
export function getRememberMeDaysRemaining(): number {
  try {
    const expiresAt = localStorage.getItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);
    if (!expiresAt) return 0;

    const expirationTime = parseInt(expiresAt, 10);
    const now = Date.now();
    const remaining = expirationTime - now;

    if (remaining <= 0) return 0;

    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  } catch {
    return 0;
  }
}
