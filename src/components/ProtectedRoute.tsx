import { memo } from 'react';
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
}

export const ProtectedRoute = memo(function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
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

  // User exists, show protected content
  return <>{children}</>;
});
