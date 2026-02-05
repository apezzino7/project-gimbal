/**
 * Admin Users Page
 * User management interface for administrators
 */

import { memo, useState, useCallback } from 'react';
import { AppLayout } from '../../components/layout';
import { UserList, UserForm } from '../../components/admin';
import { Modal } from '../../components/common/Modal';
import { useCurrentProfile } from '../../hooks/useProfile';
import { useNavigation } from '../../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const AdminUsersPage = memo(function AdminUsersPage() {
  const { data: currentUser } = useCurrentProfile();
  const { navItems } = useNavigation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  return (
    <AppLayout
      navItems={navItems}
      user={currentUser ? { name: currentUser.displayName || currentUser.email, email: currentUser.email } : null}
    >
      <div className="min-h-screen bg-[#f5f5f5]">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#003559]">User Management</h1>
            <p className="mt-1 text-gray-600">
              Manage user accounts, roles, and permissions
            </p>
          </div>

          {/* User List */}
          <UserList onSelect={handleSelectUser} />

          {/* Edit User Modal */}
          <Modal
            isOpen={!!selectedUserId}
            onClose={handleCloseModal}
            title="Edit User"
            size="lg"
          >
            {selectedUserId && (
              <UserForm
                userId={selectedUserId}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseModal}
              />
            )}
          </Modal>
        </main>
      </div>
    </AppLayout>
  );
});

export default AdminUsersPage;
