import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rateLimiter';
import { RATE_LIMIT } from '../../constants/app';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;
  const testEmail = 'test@example.com';

  beforeEach(() => {
    localStorage.clear();
    rateLimiter = new RateLimiter();
  });

  describe('isLocked', () => {
    it('should return false for new users', () => {
      expect(rateLimiter.isLocked(testEmail)).toBe(false);
    });

    it('should return true when user is locked out', () => {
      // Record max attempts to trigger lockout
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }
      expect(rateLimiter.isLocked(testEmail)).toBe(true);
    });

    it('should return false after lockout period expires', () => {
      // Record max attempts
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }

      // Mock time passing
      vi.useFakeTimers();
      vi.advanceTimersByTime(RATE_LIMIT.LOCKOUT_DURATION_MS + 1000);

      expect(rateLimiter.isLocked(testEmail)).toBe(false);
      vi.useRealTimers();
    });
  });

  describe('recordFailedAttempt', () => {
    it('should increment attempt count', () => {
      rateLimiter.recordFailedAttempt(testEmail);
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS - 1);
    });

    it('should lock account after max attempts', () => {
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }
      expect(rateLimiter.isLocked(testEmail)).toBe(true);
    });

    it('should reset count after attempt window passes', () => {
      rateLimiter.recordFailedAttempt(testEmail);
      rateLimiter.recordFailedAttempt(testEmail);

      // Mock time passing beyond attempt window
      vi.useFakeTimers();
      vi.advanceTimersByTime(RATE_LIMIT.ATTEMPT_WINDOW_MS + 1000);

      rateLimiter.recordFailedAttempt(testEmail);
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS - 1);
      vi.useRealTimers();
    });
  });

  describe('getLockoutTimeRemaining', () => {
    it('should return 0 for non-locked users', () => {
      expect(rateLimiter.getLockoutTimeRemaining(testEmail)).toBe(0);
    });

    it('should return positive minutes for locked users', () => {
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }
      const remaining = rateLimiter.getLockoutTimeRemaining(testEmail);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(RATE_LIMIT.LOCKOUT_DURATION_MIN);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new users', () => {
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS);
    });

    it('should decrease with each failed attempt', () => {
      rateLimiter.recordFailedAttempt(testEmail);
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS - 1);

      rateLimiter.recordFailedAttempt(testEmail);
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS - 2);
    });

    it('should return 0 when locked', () => {
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all attempts', () => {
      rateLimiter.recordFailedAttempt(testEmail);
      rateLimiter.recordFailedAttempt(testEmail);
      rateLimiter.reset(testEmail);
      expect(rateLimiter.getRemainingAttempts(testEmail)).toBe(RATE_LIMIT.MAX_ATTEMPTS);
    });

    it('should unlock a locked account', () => {
      for (let i = 0; i < RATE_LIMIT.MAX_ATTEMPTS; i++) {
        rateLimiter.recordFailedAttempt(testEmail);
      }
      expect(rateLimiter.isLocked(testEmail)).toBe(true);

      rateLimiter.reset(testEmail);
      expect(rateLimiter.isLocked(testEmail)).toBe(false);
    });
  });

  describe('different users', () => {
    it('should track attempts separately per email', () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';

      rateLimiter.recordFailedAttempt(user1);
      rateLimiter.recordFailedAttempt(user1);

      expect(rateLimiter.getRemainingAttempts(user1)).toBe(RATE_LIMIT.MAX_ATTEMPTS - 2);
      expect(rateLimiter.getRemainingAttempts(user2)).toBe(RATE_LIMIT.MAX_ATTEMPTS);
    });
  });
});
