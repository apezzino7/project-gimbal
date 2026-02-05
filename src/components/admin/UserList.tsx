/**
 * UserList Component
 * Displays a list of users with search and filter capabilities
 */

import { useState, useMemo, useCallback } from 'react';
import type { Profile, UserRole } from '@/types/admin';
import { useProfiles, useProfileStats } from '@/hooks/useProfile';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { EmptyState } from '../common/EmptyState';
import { RoleBadge } from './RoleBadge';

// =============================================================================
// Types
// =============================================================================

export interface UserListProps {
  /** Called when a user is selected */
  onSelect?: (userId: string) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m9 5.197a6 6 0 00-9-5.197"
      />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const ROLE_OPTIONS: Array<{ value: UserRole | ''; label: string }> = [
  { value: '', label: 'All Roles' },
  { value: 'admin', label: 'Administrator' },
  { value: 'user', label: 'User' },
  { value: 'viewer', label: 'Viewer' },
];

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All Users' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const ITEMS_PER_PAGE = 25;

// =============================================================================
// Sub-components
// =============================================================================

interface UserRowProps {
  user: Profile;
  onSelect?: (userId: string) => void;
}

function UserRow({ user, onSelect }: UserRowProps) {
  const displayName = user.displayName || user.email.split('@')[0];
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleDateString()
    : 'Never';

  return (
    <tr
      className="hover:bg-[#f5f5f5] transition-colors cursor-pointer"
      onClick={() => onSelect?.(user.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(user.id);
        }
      }}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center overflow-hidden">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon />
            )}
          </div>
          <div>
            <div className="font-medium text-[#003559]">{displayName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <RoleBadge role={user.role} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {user.isActive ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-[#2e7d32]">
            <span className="w-2 h-2 bg-[#2e7d32] rounded-full" aria-hidden="true" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
            <span className="w-2 h-2 bg-gray-400 rounded-full" aria-hidden="true" />
            Inactive
          </span>
        )}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {lastLogin}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {new Date(user.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

interface StatsCardProps {
  label: string;
  value: number;
  color?: string;
}

function StatsCard({ label, value, color = 'text-[#003559]' }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] px-4 py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UserList({ onSelect, className = '' }: UserListProps) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>('');
  const [page, setPage] = useState(0);

  // Build search params
  const searchParams = useMemo(
    () => ({
      search: search || undefined,
      role: roleFilter || undefined,
      isActive: statusFilter === '' ? undefined : statusFilter === 'active',
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    }),
    [search, roleFilter, statusFilter, page]
  );

  // Fetch data
  const { data: users = [], isLoading, error } = useProfiles(searchParams);
  const { data: stats } = useProfileStats();

  // Handle search with debounce
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(0);
    },
    []
  );

  // Handle filter changes
  const handleRoleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setRoleFilter(e.target.value as UserRole | '');
    setPage(0);
  }, []);

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setStatusFilter(e.target.value as 'active' | 'inactive' | '');
      setPage(0);
    },
    []
  );

  // Loading state
  if (isLoading && !users.length) {
    return (
      <Card className={className}>
        <CardHeader>Users</CardHeader>
        <div className="p-8 text-center text-gray-500">Loading users...</div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>Users</CardHeader>
        <div className="p-8 text-center text-[#d32f2f]">
          Failed to load users. Please try again.
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Total Users" value={stats.total} />
          <StatsCard label="Active" value={stats.active} color="text-[#2e7d32]" />
          <StatsCard label="Admins" value={stats.byRole.admin} color="text-[#d32f2f]" />
          <StatsCard label="Regular Users" value={stats.byRole.user} color="text-[#0353a4]" />
        </div>
      )}

      <Card>
        <CardHeader>User Management</CardHeader>

        {/* Filters */}
        <div className="p-4 border-b border-[#e0e0e0]">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <Input
                type="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
                aria-label="Search users"
              />
            </div>

            {/* Role Filter */}
            <Select
              value={roleFilter}
              onChange={handleRoleChange}
              hideLabel
              options={ROLE_OPTIONS}
              className="md:w-48"
            />

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={handleStatusChange}
              hideLabel
              options={STATUS_OPTIONS}
              className="md:w-40"
            />
          </div>
        </div>

        {/* Table */}
        {users.length === 0 ? (
          <EmptyState
            icon={<UsersIcon />}
            title="No users found"
            description={
              search || roleFilter || statusFilter
                ? 'Try adjusting your search or filters'
                : 'Users will appear here once they sign up'
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#f5f5f5]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Last Login
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e0e0e0]">
                  {users.map((user) => (
                    <UserRow key={user.id} user={user} onSelect={onSelect} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {users.length >= ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-[#e0e0e0] flex justify-between items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {page + 1}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={users.length < ITEMS_PER_PAGE}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default UserList;
