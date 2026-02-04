---
description: Utility function development rules
globs: src/utils/**/*
---

# Utility Functions Rules

## File Organization
- One domain per file (validation.ts, rateLimiter.ts)
- Tests in `__tests__/filename.test.ts`
- Export individual functions, not default object

## Documentation Requirements
```tsx
/**
 * Validates email format and sanitizes input
 * @param email - Raw email input from user
 * @returns Sanitized lowercase email
 * @throws {ValidationError} When email format is invalid
 *
 * @example
 * const clean = sanitizeEmail('  User@Example.COM  ');
 * // Returns: 'user@example.com'
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(sanitized)) {
    throw new ValidationError('Invalid email format');
  }
  return sanitized;
}
```

## Testing Requirements
- Every exported function must have tests
- Test edge cases and error conditions
- Use descriptive test names

```tsx
// __tests__/validation.test.ts
import { describe, it, expect } from 'vitest';
import { sanitizeEmail } from '../validation';

describe('sanitizeEmail', () => {
  it('should lowercase and trim email', () => {
    expect(sanitizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });

  it('should throw ValidationError for invalid email', () => {
    expect(() => sanitizeEmail('not-an-email')).toThrow('Invalid email format');
  });
});
```

## Pure Functions
Utilities should be pure when possible:
- No side effects
- Same input = same output
- No external state dependencies

## Security-Critical Utilities

### validation.ts
- Sanitize all user input before use
- Return structured validation results
- Never trust client-side validation alone

### rateLimiter.ts
- Never expose raw attempt data
- Always sanitize email before storage key
- Use constants from RATE_LIMIT config

```tsx
// Pattern for rate limiting check
const limiter = new RateLimiter();
if (limiter.isLocked(email)) {
  const remaining = limiter.getLockoutTimeRemaining(email);
  throw new RateLimitError(`Account locked. Try again in ${remaining} minutes.`);
}
```

### auditLog.ts
- Log asynchronously (non-blocking)
- Retry failed server logs
- Limit local storage size (max 1000 entries)
- Never log sensitive data (passwords, tokens)

```tsx
// Required audit logging pattern
await auditLogger.log('EVENT_TYPE', {
  userId: user.id,
  action: 'description',
  // metadata
});
```

### errors.ts
Error hierarchy:
- `AppError` - Base class with code and statusCode
- `AuthError` - Authentication failures (401)
- `RateLimitError` - Rate limit exceeded (429)
- `ValidationError` - Input validation (400)
- `NetworkError` - Connectivity issues (503)

## Utility Categories
```
src/utils/
├── validation.ts       # Input validation, sanitization
├── rateLimiter.ts      # Login rate limiting
├── auditLog.ts         # Security event logging
├── rememberMe.ts       # Session persistence
├── errors.ts           # Error classes
├── formatters.ts       # Date, currency, number formatting
├── phone.ts            # Phone number validation/formatting
└── __tests__/          # Unit tests
```
