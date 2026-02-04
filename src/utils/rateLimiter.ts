/**
 * Rate Limiter for Login Attempts
 * Prevents brute force attacks by limiting login attempts
 */

import { RATE_LIMIT, STORAGE_KEYS } from '../constants/app';

interface LoginAttempt {
  count: number;
  firstAttempt: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private getAttempts(email: string): LoginAttempt {
    try {
      const data = localStorage.getItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}-${email}`);
      return data ? JSON.parse(data) : { count: 0, firstAttempt: Date.now() };
    } catch {
      return { count: 0, firstAttempt: Date.now() };
    }
  }

  private setAttempts(email: string, attempts: LoginAttempt): void {
    try {
      localStorage.setItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}-${email}`, JSON.stringify(attempts));
    } catch (error) {
      console.error('Failed to save login attempts:', error);
    }
  }

  /**
   * Check if user is currently locked out
   */
  isLocked(email: string): boolean {
    const attempts = this.getAttempts(email);

    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
      return true;
    }

    // Reset if lockout period has passed
    if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
      this.reset(email);
      return false;
    }

    return false;
  }

  /**
   * Get remaining time for lockout in minutes
   */
  getLockoutTimeRemaining(email: string): number {
    const attempts = this.getAttempts(email);
    if (!attempts.lockedUntil) return 0;

    const remaining = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
    return Math.max(0, remaining);
  }

  /**
   * Record a failed login attempt
   */
  recordFailedAttempt(email: string): void {
    const attempts = this.getAttempts(email);
    const now = Date.now();

    // Reset count if attempt window has passed
    if (now - attempts.firstAttempt > RATE_LIMIT.ATTEMPT_WINDOW_MS) {
      attempts.count = 1;
      attempts.firstAttempt = now;
      delete attempts.lockedUntil;
    } else {
      attempts.count++;

      // Lock account if max attempts reached
      if (attempts.count >= RATE_LIMIT.MAX_ATTEMPTS) {
        attempts.lockedUntil = now + RATE_LIMIT.LOCKOUT_DURATION_MS;
      }
    }

    this.setAttempts(email, attempts);
  }

  /**
   * Reset attempts after successful login
   */
  reset(email: string): void {
    try {
      localStorage.removeItem(`${STORAGE_KEYS.LOGIN_ATTEMPTS}-${email}`);
    } catch (error) {
      console.error('Failed to reset login attempts:', error);
    }
  }

  /**
   * Get remaining attempts before lockout
   */
  getRemainingAttempts(email: string): number {
    const attempts = this.getAttempts(email);
    return Math.max(0, RATE_LIMIT.MAX_ATTEMPTS - attempts.count);
  }
}

export const rateLimiter = new RateLimiter();
