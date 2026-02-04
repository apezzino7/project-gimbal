import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sanitizeEmail } from '../utils/validation';
import { rateLimiter } from '../utils/rateLimiter';
import { auditLogger, AuditEventType } from '../utils/auditLog';
import { AUTH_CONSTANTS, STORAGE_KEYS } from '../constants/app';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  // Check lockout status on mount and when email changes
  useEffect(() => {
    if (email) {
      const sanitized = sanitizeEmail(email);
      const locked = rateLimiter.isLocked(sanitized);
      setIsLocked(locked);
      if (locked) {
        setLockoutTime(rateLimiter.getLockoutTimeRemaining(sanitized));
      }
    }
  }, [email]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(email);

    // Check rate limiting
    if (rateLimiter.isLocked(sanitizedEmail)) {
      const remainingTime = rateLimiter.getLockoutTimeRemaining(sanitizedEmail);
      setError(`Account temporarily locked. Please try again in ${remainingTime} minutes.`);
      setLoading(false);
      auditLogger.log(AuditEventType.ACCOUNT_LOCKED, sanitizedEmail);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) throw error;

      // Success! Reset rate limiter and log success
      rateLimiter.reset(sanitizedEmail);
      auditLogger.log(AuditEventType.LOGIN_SUCCESS, sanitizedEmail, {
        rememberMe,
      });

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES,
          (Date.now() + AUTH_CONSTANTS.REMEMBER_ME_DURATION_MS).toString()
        );
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME_EXPIRES);
      }

      // Set flag for welcome toast on dashboard
      sessionStorage.setItem('gimbal-just-logged-in', 'true');

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      // Record failed attempt
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      rateLimiter.recordFailedAttempt(sanitizedEmail);
      auditLogger.log(AuditEventType.LOGIN_FAILED, sanitizedEmail, {
        error: errorMessage,
      });

      const remainingAttempts = rateLimiter.getRemainingAttempts(sanitizedEmail);

      if (remainingAttempts > 0) {
        setError(`Invalid credentials. ${remainingAttempts} attempts remaining.`);
      } else {
        const lockTime = rateLimiter.getLockoutTimeRemaining(sanitizedEmail);
        setError(`Too many failed attempts. Account locked for ${lockTime} minutes.`);
        setIsLocked(true);
        setLockoutTime(lockTime);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f5f5f5] px-3">
      <div className="w-full max-w-sm p-5 bg-white rounded shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
        <h1 className="text-lg font-bold mb-4 text-center text-[#003559]">
          Project Gimbal
        </h1>

        {isLocked && lockoutTime > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-3 p-2.5 text-xs bg-orange-50 text-orange-700 rounded border border-orange-200"
          >
            <strong>Account Locked:</strong> Too many failed attempts.
            Wait {lockoutTime} min{lockoutTime !== 1 ? 's' : ''}.
          </div>
        )}

        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            className="mb-3 p-2.5 text-xs bg-red-50 text-[#d32f2f] rounded border border-red-200"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} aria-describedby={error ? 'login-error' : undefined}>
          <div className="mb-3">
            <label
              htmlFor="email"
              className="block text-xs font-medium mb-1.5 text-[#000000]"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!error}
              disabled={isLocked}
              autoComplete="email"
              className="w-full h-9 px-2.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4] disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="test@example.com"
            />
          </div>

          <div className="mb-3">
            <label
              htmlFor="password"
              className="block text-xs font-medium mb-1.5 text-[#000000]"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              aria-required="true"
              aria-invalid={!!error}
              disabled={isLocked}
              autoComplete="current-password"
              className="w-full h-9 px-2.5 text-sm border border-[#e0e0e0] rounded focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4] disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="remember-me" className="flex items-center cursor-pointer">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLocked}
                className="w-3.5 h-3.5 text-[#0353a4] border-[#e0e0e0] rounded-sm focus:ring-2 focus:ring-[#0353a4] disabled:cursor-not-allowed"
              />
              <span className="ml-2 text-xs text-[#000000]">
                Remember me for {AUTH_CONSTANTS.REMEMBER_ME_DURATION_DAYS} days
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || isLocked}
            aria-busy={loading}
            aria-disabled={loading || isLocked}
            className="w-full h-9 px-4 text-sm font-medium bg-[#0353a4] text-white rounded hover:bg-[#003559] transition-colors duration-200 disabled:bg-[#f5f5f5] disabled:text-[#9e9e9e] disabled:cursor-not-allowed disabled:border disabled:border-[#e0e0e0]"
          >
            {loading ? 'Logging in...' : isLocked ? 'Account Locked' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
