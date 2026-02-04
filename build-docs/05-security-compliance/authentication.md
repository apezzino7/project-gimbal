# Authentication Implementation

## Overview

Project Gimbal uses **Supabase Auth** for authentication. Supabase handles all the complexity of authentication under the hood—JWT tokens, refresh tokens, storage, session management—so you don't have to think about it.

**Philosophy**: Use what Supabase gives you. Don't build custom auth logic when Supabase provides it out of the box.

## How Supabase Auth Works

Supabase Auth automatically handles:
- ✅ JWT token generation and validation
- ✅ Refresh token rotation
- ✅ Secure token storage (localStorage with encryption)
- ✅ Session persistence across page reloads
- ✅ Automatic token refresh before expiration
- ✅ Cookie-based auth for server-side rendering (optional)

**You just call the auth methods—Supabase does the rest.**

## Authentication Flow

### Login Process
```typescript
// That's it! Supabase handles everything else.
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Supabase automatically:
// - Validates credentials
// - Generates JWT + refresh token
// - Stores tokens securely
// - Sets up session
// - Manages token refresh
```

### Logout Process
```typescript
// One line. Supabase cleans up everything.
await supabase.auth.signOut();

// Supabase automatically:
// - Removes tokens from storage
// - Clears session
// - Invalidates refresh token
```

### Session Persistence
```typescript
// On page load/refresh, Supabase automatically:
// - Checks for valid session
// - Refreshes expired tokens
// - Restores user session

const { data: { session } } = await supabase.auth.getSession();
// Session is already refreshed if needed—you don't do anything
```

## Authentication Component

### AuthWrapper Component
```jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const AuthWrapper = ({ children, requiredRole = 'viewer' }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Redirect to login if no user
        navigate('/login');
        setLoading(false);
        return;
      }

      // Check role requirements using hierarchy (admin > user > viewer)
      const userRole = user.user_metadata?.role || 'viewer';
      if (!hasRole(userRole, requiredRole)) {
        // Redirect to unauthorized page or dashboard
        navigate('/unauthorized');
        setLoading(false);
        return;
      }

      setUser(user);
      setLoading(false);
    };

    checkUser();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/login');
      }
    });
  }, [navigate, requiredRole]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};

export default AuthWrapper;
```

### Usage Example
```jsx
// In your routes
import AuthWrapper from '../components/AuthWrapper';
import { hasRole } from '../utils/roles';

// Viewer+ can access (all logged-in users)
function Reports() {
  return (
    <AuthWrapper requiredRole="viewer">
      <ReportsPage />
    </AuthWrapper>
  );
}

// User+ can access (users and admins, not viewers)
function Campaigns() {
  return (
    <AuthWrapper requiredRole="user">
      <CampaignsPage />
    </AuthWrapper>
  );
}

// Admin only
function AdminPanel() {
  return (
    <AuthWrapper requiredRole="admin">
      <AdminPage />
    </AuthWrapper>
  );
}
```

## User Roles (3-Tier MVP)

### Role Definitions

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| **Admin** | Full access | User management, settings, all campaigns, all analytics |
| **User** | Standard access | Create/manage own campaigns, view analytics, run reports |
| **Viewer** | Read-only | View reports and analytics only, no create/edit |

### Role Hierarchy
```
Admin > User > Viewer
```

### Role Management
- Roles are stored in `user_metadata.role` during signup
- Role-based access control enforced at both frontend (ProtectedRoute) and backend (RLS)
- Only Admins can assign or change roles
- Default role for new signups: `user`

### Role Check Helper
```typescript
// src/utils/roles.ts
type Role = 'admin' | 'user' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 3,
  user: 2,
  viewer: 1,
};

export function hasRole(userRole: Role | undefined, requiredRole: Role): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Usage:
// hasRole('admin', 'user') → true (admin can access user pages)
// hasRole('viewer', 'user') → false (viewer cannot access user pages)
```

## Session Management

### What Supabase Handles Automatically

**Token Management**
- Tokens stored in localStorage (encrypted by browser)
- Automatic refresh before expiration (you never see this happen)
- No manual token management needed
- No need to handle refresh token rotation

**Session Lifecycle**
- Sessions persist across browser sessions
- Automatic cleanup on logout
- Session restored on app reload
- Real-time session state via `onAuthStateChange`

**Security Built-In**
- JWTs signed with secret key
- Short-lived access tokens (1 hour default)
- Refresh tokens for seamless renewal
- PKCE flow for OAuth providers

### What You Configure in Supabase Dashboard

**Password Policy** (Settings > Authentication)
- Minimum password length (default: 6, recommend: 12)
- Password strength requirements
- Password expiry (optional)

**Account Security**
- Email confirmation required (recommended: enabled)
- Failed login attempt limits
- Session timeout (default: 7 days for refresh token)

**Multi-Factor Authentication**
- TOTP (Time-based One-Time Password)
- Configured per-user via `supabase.auth.mfa.enroll()`

## Implementation Guide

### 1. Supabase Client Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create client once, use everywhere
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,     // Automatic token refresh (default: true)
    persistSession: true,        // Persist session in localStorage (default: true)
    detectSessionInUrl: true     // Auto-handle OAuth callbacks (default: true)
  }
});
```

### 2. Authentication Methods

**Email/Password Login**
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

if (error) {
  console.error('Login failed:', error.message);
} else {
  console.log('User logged in:', data.user);
  // Supabase auto-stores session, redirects handled by your app
}
```

**OAuth Login (Google, GitHub, etc.)**
```typescript
// Supabase handles the entire OAuth flow
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/auth/callback`
  }
});
// User is redirected to Google, then back to your callback URL
// Supabase automatically extracts tokens from URL and stores session
```

**Sign Up**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'newuser@example.com',
  password: 'password123',
  options: {
    data: {
      first_name: 'John',
      last_name: 'Doe',
      role: 'user'  // Default role (admin, user, or viewer)
    }
  }
});
```

**Sign Out**
```typescript
await supabase.auth.signOut();
// That's it. Everything is cleaned up automatically.
```

**Get Current User**
```typescript
// Get user from existing session (no API call)
const { data: { user } } = await supabase.auth.getUser();

// Or listen to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event); // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
  console.log('Session:', session);
});
```

## Protected Routes & Role-Based Access Control

### Using onAuthStateChange for Route Protection

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
```

### Protected Route Component

```tsx
// src/components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { hasRole, type Role } from '../utils/roles';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;  // 'admin' | 'user' | 'viewer'
}

export function ProtectedRoute({ children, requiredRole = 'viewer' }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role using hierarchy: admin > user > viewer
  const userRole = user.user_metadata?.role as Role | undefined;
  if (!hasRole(userRole, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
```

### Usage in Routes

```tsx
// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Viewer+ routes (all authenticated users) */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="viewer">
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="viewer">
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* User+ routes (users and admins only) */}
        <Route
          path="/campaigns/*"
          element={
            <ProtectedRoute requiredRole="user">
              <CampaignsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

## Error Handling

### Common Authentication Errors
- Invalid credentials
- Account not verified
- Session expired
- Insufficient permissions
- Network errors

### Error Responses
- Clear user-friendly error messages
- Automatic redirect to appropriate pages
- Logging of authentication events for security monitoring

## Advanced Features

### Multi-Factor Authentication (MFA)

> **Note**: MFA is a **Phase D (Future)** feature. For MVP, email/password authentication is sufficient. Implement MFA when moving to enterprise features.

Supabase has built-in MFA support using TOTP (Authenticator apps).

```typescript
// Enroll user in MFA
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'My Authenticator'
});

// User scans QR code: data.totp.qr_code
// User enters code to verify
await supabase.auth.mfa.challengeAndVerify({
  factorId: data.id,
  code: '123456'
});

// On subsequent logins, challenge MFA
const { data: { factors } } = await supabase.auth.mfa.listFactors();
await supabase.auth.mfa.challenge({ factorId: factors[0].id });
await supabase.auth.mfa.verify({ factorId: factors[0].id, code: '123456' });
```

### Social Login (OAuth)

Supabase supports OAuth providers out of the box. Enable in Supabase Dashboard → Authentication → Providers.

```typescript
// Google
await supabase.auth.signInWithOAuth({ provider: 'google' });

// GitHub
await supabase.auth.signInWithOAuth({ provider: 'github' });

// Microsoft Azure
await supabase.auth.signInWithOAuth({ provider: 'azure' });

// More: facebook, twitter, discord, gitlab, etc.
```

### Password Recovery

Supabase handles password reset flows automatically.

```typescript
// Send password reset email
await supabase.auth.resetPasswordForEmail('user@example.com', {
  redirectTo: `${window.location.origin}/reset-password`
});

// User clicks link in email, lands on /reset-password
// Update password
await supabase.auth.updateUser({
  password: 'new-password'
});
```

### Magic Links (Passwordless)

```typescript
await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`
  }
});
// User receives email with magic link, clicks it, auto-signed in
```

## Server-Side Auth (Edge Functions)

When calling Edge Functions, Supabase automatically includes the user's JWT in the request.

```typescript
// Client-side
const { data, error } = await supabase.functions.invoke('my-function', {
  body: { message: 'Hello' }
});

// Edge Function (Deno)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // Supabase client with user's JWT
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! }
      }
    }
  );

  // Get authenticated user
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // User is authenticated, proceed with logic
  return new Response(JSON.stringify({ userId: user.id }));
});
```

## Common Patterns

### Check if User is Logged In

```typescript
const { data: { session } } = await supabase.auth.getSession();
const isLoggedIn = !!session;
```

### Get User Metadata

```typescript
const { data: { user } } = await supabase.auth.getUser();
const role = user?.user_metadata?.role;
const firstName = user?.user_metadata?.first_name;
```

### Update User Metadata

```typescript
await supabase.auth.updateUser({
  data: {
    first_name: 'Jane',
    role: 'admin'
  }
});
```

### Handle Auth Errors

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});

if (error) {
  switch (error.message) {
    case 'Invalid login credentials':
      // Show "Invalid email or password"
      break;
    case 'Email not confirmed':
      // Show "Please confirm your email"
      break;
    default:
      // Generic error
  }
}
```

## Best Practices

### ✅ DO
- Use `supabase.auth.getUser()` to get current user
- Use `onAuthStateChange` for real-time auth updates
- Let Supabase handle token refresh automatically
- Store custom user data in `user_metadata` during signup
- Use Row-Level Security (RLS) policies for backend authorization

### ❌ DON'T
- Manually manage JWT tokens
- Store tokens yourself in localStorage/cookies
- Build custom refresh token logic
- Try to decode/validate JWTs client-side
- Bypass Supabase Auth methods

## Key Takeaway

**Supabase Auth abstracts away all the complexity.** You call `signInWithPassword()`, `signInWithOAuth()`, or `signOut()`—everything else (JWTs, refresh tokens, storage, session management) is handled automatically.

Focus on your application logic, not auth infrastructure.