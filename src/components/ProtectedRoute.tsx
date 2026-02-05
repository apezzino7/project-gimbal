import { memo, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/admin/profileService';
import type { UserRole } from '../types/admin';
import { hasMinimumRole } from '../types/admin';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Optional minimum role required to access this route */
  requiredRole?: UserRole;
  /** Where to redirect if user lacks permission (defaults to /dashboard) */
  unauthorizedRedirect?: string;
}

export const ProtectedRoute = memo(function ProtectedRoute({
  children,
  requiredRole,
  unauthorizedRedirect = '/dashboard',
}: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [roleLoading, setRoleLoading] = useState(!!requiredRole);

  // Fetch user role if requiredRole is specified
  useEffect(() => {
    async function fetchRole() {
      if (!user || !requiredRole) {
        setRoleLoading(false);
        return;
      }

      try {
        const role = await profileService.getCurrentRole();
        setUserRole(role);
      } catch (error) {
        console.error('Failed to fetch user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    }

    if (user && requiredRole) {
      fetchRole();
    } else {
      setRoleLoading(false);
    }
  }, [user, requiredRole]);

  // Show loading spinner while checking auth or role
  if (authLoading || roleLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen bg-[#f5f5f5]"
        role="status"
        aria-live="polite"
        aria-label="Checking authentication"
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-[#0353a4] border-t-transparent"
          aria-hidden="true"
        />
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  // No user? Redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check role if required
  if (requiredRole && userRole) {
    if (!hasMinimumRole(userRole, requiredRole)) {
      return <Navigate to={unauthorizedRedirect} replace />;
    }
  }

  // If requiredRole is specified but no role found, redirect
  if (requiredRole && !userRole) {
    return <Navigate to={unauthorizedRedirect} replace />;
  }

  // User exists and has required role (or no role required), show protected content
  return <>{children}</>;
});
