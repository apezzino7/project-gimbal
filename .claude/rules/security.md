---
description: Security and compliance development rules
globs:
  - src/**/*auth*/**/*
  - src/**/*security*/**/*
  - src/**/login*/**/*
  - src/**/session*/**/*
---

# Security & Compliance Rules

## Authentication

### PKCE Flow (Required)
Supabase client must use PKCE:
```tsx
const supabase = createClient(url, key, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
  }
});
```

### Session Management
- Access token: 15 minutes
- Refresh token: 7 days
- Inactivity timeout: 30 minutes
- Remember me: 30 days

### Password Requirements
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character
- No reuse of last 5 passwords

### MFA Requirements (Future - Phase D)
- TOTP (authenticator app) preferred
- Recovery codes generated
- Currently optional for MVP

## Authorization (RBAC)

### Role Hierarchy (MVP: 3 Tiers)
```
Admin > User > Viewer

Admin:  Full access, user management, settings
User:   Create/manage campaigns, view analytics
Viewer: Read-only access to reports
```

### Permission Checks
```tsx
// Component level
function AdminOnlyButton() {
  const { user } = useAuthStore();
  if (!hasRole(user, ['admin'])) return null;
  return <Button>Admin Action</Button>;
}

// Service level
async function deleteUser(targetId: string) {
  const user = await getCurrentUser();
  if (!hasRole(user, ['admin'])) {
    throw new AuthError('Insufficient permissions');
  }
  // proceed
}
```

## Input Validation

### Always Validate
```tsx
import { z } from 'zod';
import DOMPurify from 'dompurify';

// Schema validation
const userInput = inputSchema.parse(rawInput);

// HTML sanitization
const cleanHtml = DOMPurify.sanitize(userHtml);

// Email sanitization
const email = sanitizeEmail(rawEmail);
```

### Never Trust Client
- Validate on client for UX
- Always re-validate on server/Edge Function
- Use parameterized queries (never string concatenation)

## Rate Limiting

### Implementation
```tsx
const limiter = new RateLimiter();

// Before auth operations
if (limiter.isLocked(email)) {
  const minutes = limiter.getLockoutTimeRemaining(email);
  await auditLogger.log('ACCOUNT_LOCKED', { email });
  throw new RateLimitError(`Try again in ${minutes} minutes`);
}

// On failure
limiter.recordFailedAttempt(email);
const remaining = limiter.getRemainingAttempts(email);

// On success
limiter.reset(email);
```

### Limits
- Auth: 5 attempts / 15 min lockout
- API Read: 100/min
- API Write: 50/min
- Campaign Send: 10/min

## Audit Logging

### Required Events
```tsx
// Auth events
'LOGIN_SUCCESS', 'LOGIN_FAILED', 'LOGOUT', 'SESSION_EXPIRED'
'ACCOUNT_LOCKED', 'PASSWORD_CHANGED', 'MFA_ENABLED', 'MFA_DISABLED'

// User management
'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'ROLE_CHANGED'

// Data access
'DATA_EXPORTED', 'DATA_DELETED', 'CONSENT_UPDATED'

// Campaign events
'CAMPAIGN_CREATED', 'CAMPAIGN_SENT', 'CAMPAIGN_FAILED'
```

### Logging Pattern
```tsx
await auditLogger.log('EVENT_TYPE', {
  userId: user.id,
  email: user.email,
  action: 'description',
  resourceId: resource.id,
  metadata: { /* additional context */ },
});
```

### Retention
- 30 days for MVP (internal project)
- Future: 7 years for SOC 2 compliance (Phase D)
- Indexed for efficient querying

## Messaging Compliance (MVP)

### TCPA (SMS)
- Prior consent required before any SMS
- Opt-out honored immediately (STOP keyword)
- Quiet hours: 8 AM - 9 PM recipient timezone
- Consent timestamp tracked

### CAN-SPAM (Email)
- Physical address in emails
- Clear unsubscribe mechanism
- 10-day honor window for unsubscribes

## GDPR Compliance (Future - Phase D)

### Data Subject Rights
- **Access:** Export all user data (JSON/CSV)
- **Erasure:** Soft delete → 30-day hard delete
- **Portability:** Machine-readable export

See `build-docs/10-future/advanced-compliance.md` for full GDPR implementation.

## Secrets Management

### Never Commit
- API keys
- Passwords
- Tokens
- Private keys
- .env files

### Environment Variables
```tsx
// Access via config
import { config } from '@/config/env';

// Validated at startup
const supabaseUrl = config.SUPABASE_URL;
```

## Security Headers
Configured in vite.config.ts:
- Content-Security-Policy
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
