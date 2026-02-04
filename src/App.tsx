import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { CampaignDetailPage } from './pages/CampaignDetailPage';
import { CreateCampaignPage } from './pages/CreateCampaignPage';
import { EditCampaignPage } from './pages/EditCampaignPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './contexts/ToastContext';
import { QueryProvider } from './lib/QueryProvider';
import { useAuthStore } from './stores/authStore';

/**
 * Initialize auth state on app mount
 */
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <AuthInitializer>
          <ToastProvider position="top-right">
            <BrowserRouter>
              <Routes>
                {/* Public route */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* Campaign routes */}
                <Route
                  path="/campaigns"
                  element={
                    <ProtectedRoute>
                      <CampaignsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns/new"
                  element={
                    <ProtectedRoute>
                      <CreateCampaignPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns/:id"
                  element={
                    <ProtectedRoute>
                      <CampaignDetailPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/campaigns/:id/edit"
                  element={
                    <ProtectedRoute>
                      <EditCampaignPage />
                    </ProtectedRoute>
                  }
                />

                {/* Default redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthInitializer>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
