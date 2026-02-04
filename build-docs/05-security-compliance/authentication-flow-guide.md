# Complete Authentication Flow Guide

## Overview

This guide shows the **complete authentication flow** for Project Gimbal, from login to protected routes with automatic redirects.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    User Journey                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. User visits /dashboard (protected route)                │
│     ↓                                                        │
│  2. useAuth hook checks session                             │
│     ↓                                                        │
│  3. No session? → Redirect to /login                        │
│     ↓                                                        │
│  4. User enters credentials → signInWithPassword()          │
│     ↓                                                        │
│  5. Supabase validates & stores session automatically       │
│     ↓                                                        │
│  6. onAuthStateChange fires → user state updated            │
│     ↓                                                        │
│  7. ProtectedRoute re-checks → user exists → render page    │
│     ↓                                                        │
│  8. All subsequent requests auto-authenticated              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Complete Implementation

### 1. Supabase Client Setup

**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,      // Auto-refresh tokens
    persistSession: true,         // Persist session in localStorage
    detectSessionInUrl: true      // Handle OAuth callbacks
  }
});

// Types for user with metadata
export interface UserMetadata {
  first_name?: string;
  last_name?: string;
  role?: 'user' | 'manager' | 'admin' | 'owner';
}
```

### 2. Authentication Hook

**File**: `src/hooks/useAuth.ts`

```typescript
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

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    role: user?.user_metadata?.role as string | undefined,
    isAdmin: user?.user_metadata?.role === 'admin',
    isOwner: user?.user_metadata?.role === 'owner',
  };
}
```

### 3. Protected Route Component (with Role Hierarchy)

**File**: `src/components/ProtectedRoute.tsx`

```typescript
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'user' | 'manager' | 'admin' | 'owner';
}

// Define role hierarchy (higher number = more permissions)
const ROLE_HIERARCHY = {
  user: 1,
  manager: 2,
  admin: 3,
  owner: 4,
} as const;

/**
 * Check if user's role meets the minimum required role level
 * @param userRole - The user's current role
 * @param requiredRole - The minimum role required for access
 * @returns true if user has sufficient permissions
 */
function hasRequiredRole(
  userRole: string | undefined,
  requiredRole: string | undefined
): boolean {
  if (!requiredRole) return true; // No role requirement
  if (!userRole) return false; // User has no role

  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0;

  // User's role level must be >= required level
  // This means: owner can access admin routes, admin can access manager routes, etc.
  return userLevel >= requiredLevel;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  // Not logged in → redirect to login, save attempted URL
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role hierarchy - user must have sufficient role level
  if (!hasRequiredRole(role, requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // All checks passed → render protected content
  return <>{children}</>;
}
```

### 4. Login Page

**File**: `src/pages/LoginPage.tsx`

```typescript
import { useState, FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Get the page user tried to visit (or default to dashboard)
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Success! Supabase has stored session automatically
      // Navigate to the page they were trying to visit
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Login</h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### 5. Dashboard Page (Protected)

**File**: `src/pages/DashboardPage.tsx`

```typescript
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

export function DashboardPage() {
  const { user } = useAuth();

  async function handleLogout() {
    await supabase.auth.signOut();
    // onAuthStateChange will trigger, user state will be null
    // ProtectedRoute will detect no user and redirect to /login
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Logout
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <p className="text-gray-600">
          Welcome, {user?.user_metadata?.first_name || user?.email}!
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Role: {user?.user_metadata?.role || 'user'}
        </p>
      </div>

      {/* Your dashboard content here */}
    </div>
  );
}
```

### 6. App Router Setup

**File**: `src/App.tsx`

```typescript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected routes - any authenticated user */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        {/* Manager-only routes - admin and owner can also access */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole="manager">
              <ReportsPage />
            </ProtectedRoute>
          }
        />

        {/* Admin-only routes - owner can also access */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPage />
            </ProtectedRoute>
          }
        />

        {/* Owner-only routes */}
        <Route
          path="/system-config"
          element={
            <ProtectedRoute requiredRole="owner">
              <SystemConfigPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 7. Unauthorized Page

**File**: `src/pages/UnauthorizedPage.tsx`

```typescript
import { useNavigate } from 'react-router-dom';

export function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">403</h1>
        <p className="text-xl text-gray-600 mb-8">
          You don't have permission to access this page
        </p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
```

## Flow Diagrams

### Login Flow

```
User Action                     Supabase                    React App
───────────                     ────────                    ─────────

Visit /dashboard ─────────────────────────────────────────> useAuth checks session
                                                            ↓
                                                            No session
                                                            ↓
                <───────────────────────────────────────── Redirect to /login

Enter credentials ────────────> signInWithPassword()
                                    ↓
                                Validate credentials
                                    ↓
                                Generate JWT
                                    ↓
                                Store in localStorage
                <──────────────  Return session

                ─────────────────────────────────────────> onAuthStateChange fires
                                                            ↓
                                                            user state updated
                                                            ↓
                                                            Navigate to /dashboard
                                                            ↓
                                                            useAuth has user
                                                            ↓
                                                            Render dashboard
```

### Protected Route Flow

```
Component Render
    ↓
useAuth hook
    ↓
loading = true? → Show loading spinner
    ↓
user = null? → <Navigate to="/login" state={{ from: location }} />
    ↓
requiredRole && !hasRequiredRole(userRole, requiredRole)? → <Navigate to="/unauthorized" />
    ↓
    (checks if userLevel >= requiredLevel in hierarchy)
    ↓
All checks passed → Render children
```

### Logout Flow

```
User clicks logout
    ↓
supabase.auth.signOut()
    ↓
Supabase clears tokens from localStorage
    ↓
onAuthStateChange fires with SIGNED_OUT event
    ↓
useAuth sets user = null
    ↓
ProtectedRoute detects user = null
    ↓
<Navigate to="/login" />
```

## Key Points

### ✅ What Happens Automatically

1. **Token Storage**: Supabase stores JWT + refresh token in localStorage
2. **Token Refresh**: Supabase refreshes tokens before expiry (no action needed)
3. **Session Persistence**: Session restored on page reload/refresh
4. **Auth State**: `onAuthStateChange` fires on login, logout, token refresh
5. **API Headers**: All Supabase requests include auth headers automatically

### 🔄 Redirect Behavior

| Scenario | Action |
|----------|--------|
| Unauthenticated user visits `/dashboard` | Redirect to `/login` with `state.from` |
| User logs in successfully | Redirect to `state.from` or `/dashboard` |
| User logs out | Redirect to `/login` |
| Regular user visits `/admin` page | Redirect to `/unauthorized` (requires admin role) |
| Manager visits `/admin` page | Redirect to `/unauthorized` (requires admin role) |
| Admin visits `/admin` page | Access granted (admin >= admin) |
| Owner visits `/admin` page | Access granted (owner > admin) |
| Admin visits `/reports` page | Access granted (admin > manager) |
| Already logged in user visits `/login` | Could redirect to `/dashboard` (optional) |

### 💡 Best Practices

1. **Always use `useAuth` hook** - Don't call `supabase.auth.getUser()` everywhere
2. **Save attempted URL** - Use `location.state.from` to redirect back after login
3. **Show loading state** - Prevent flash of login page during auth check
4. **Handle all auth errors** - Invalid credentials, email not confirmed, etc.
5. **Clear error on retry** - Reset error state when user tries again
6. **Use role hierarchy** - Set `requiredRole` to the minimum role level needed; higher roles automatically inherit access
7. **Validate roles server-side** - Always enforce role checks in RLS policies, not just client-side routing

## Testing Authentication

### Test Scenarios

```typescript
// 1. Login with valid credentials
const { error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});
// Should succeed, redirect to dashboard

// 2. Login with invalid credentials
const { error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'wrongpassword'
});
// Should show error: "Invalid login credentials"

// 3. Access protected route while logged out
// Visit /dashboard
// Should redirect to /login

// 4. Access admin route as regular user
// Login as user, visit /admin
// Should redirect to /unauthorized

// 5. Test role hierarchy - admin accessing manager route
// Login as admin, visit /reports (requires manager)
// Should succeed (admin > manager)

// 6. Test role hierarchy - manager accessing admin route
// Login as manager, visit /admin (requires admin)
// Should redirect to /unauthorized (manager < admin)

// 7. Test owner accessing all routes
// Login as owner, visit /dashboard, /reports, /admin, /system-config
// Should succeed on all (owner has highest permissions)

// 8. Logout
await supabase.auth.signOut();
// Should redirect to /login, all protected routes should be inaccessible
```

## Common Issues & Solutions

### Issue: "User state not updating after login"
**Solution**: Make sure `onAuthStateChange` listener is set up in `useAuth`

### Issue: "Infinite redirect loop"
**Solution**: Check that `/login` route is NOT wrapped in `ProtectedRoute`

### Issue: "Session not persisting on page refresh"
**Solution**: Verify `persistSession: true` in Supabase client config

### Issue: "User redirected to login despite being logged in"
**Solution**: Check RLS policies - they might be blocking data access

### Issue: "Role not available in user object"
**Solution**: Ensure role is set in `user_metadata` during signup

### Issue: "Admin user getting 'Unauthorized' on admin routes"
**Solution**: Check that the role in `user_metadata` exactly matches the ROLE_HIERARCHY keys (lowercase: 'user', 'manager', 'admin', 'owner')

### Issue: "Manager can't access user-level routes"
**Solution**: Verify the `hasRequiredRole()` function is using `>=` comparison (manager level 2 >= user level 1)

## Summary

This authentication system provides:
- ✅ Automatic session management (Supabase handles it)
- ✅ Protected routes with redirect to login
- ✅ Role-based access control with role hierarchy
- ✅ Return to attempted URL after login
- ✅ Loading states during auth checks
- ✅ Clean separation of concerns

**Role Hierarchy**: The system implements a 4-tier role hierarchy (user → manager → admin → owner) where higher roles automatically inherit permissions from lower roles. This means:
- Owner (level 4) can access everything
- Admin (level 3) can access admin, manager, and user routes
- Manager (level 2) can access manager and user routes
- User (level 1) can access only user routes

**Remember**: Supabase Auth does the heavy lifting. You just:
1. Call `signInWithPassword()` on login
2. Call `signOut()` on logout
3. Use `useAuth()` hook to check user state
4. Wrap routes with `<ProtectedRoute requiredRole="minimum-role">` component
5. Let the role hierarchy handle permission inheritance

Everything else (tokens, storage, refresh, headers) is handled automatically.
