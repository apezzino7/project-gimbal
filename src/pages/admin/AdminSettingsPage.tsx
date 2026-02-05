/**
 * Admin Settings Page
 * Application settings and audit log management
 */

import { memo, useState } from 'react';
import { AppLayout } from '../../components/layout';
import { SettingsForm, AuditLogViewer } from '../../components/admin';
import { Button } from '../../components/common/Button';
import { useCurrentProfile } from '../../hooks/useProfile';
import { useNavigation } from '../../hooks/useNavigation';

// =============================================================================
// Types
// =============================================================================

type TabId = 'settings' | 'audit';

// =============================================================================
// Component
// =============================================================================

export const AdminSettingsPage = memo(function AdminSettingsPage() {
  const { data: currentUser } = useCurrentProfile();
  const { navItems } = useNavigation();
  const [activeTab, setActiveTab] = useState<TabId>('settings');

  return (
    <AppLayout
      navItems={navItems}
      user={currentUser ? { name: currentUser.displayName || currentUser.email, email: currentUser.email } : null}
    >
      <div className="min-h-screen bg-[#f5f5f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#003559]">Settings</h1>
            <p className="mt-1 text-gray-600">
              Configure application settings and view audit logs
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'settings' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('settings')}
            >
              Application Settings
            </Button>
            <Button
              variant={activeTab === 'audit' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setActiveTab('audit')}
            >
              Audit Log
            </Button>
          </div>

          {/* Tab Content */}
          {activeTab === 'settings' && <SettingsForm />}
          {activeTab === 'audit' && <AuditLogViewer />}
        </main>
      </div>
    </AppLayout>
  );
});

export default AdminSettingsPage;
