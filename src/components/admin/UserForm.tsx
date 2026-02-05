/**
 * UserForm Component
 * Form for viewing and editing user profiles
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserRole } from '@/types/admin';
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/admin';
import {
  useProfile,
  useUpdateProfile,
  useUpdateUserRole,
  useDeactivateUser,
  useReactivateUser,
  useCurrentProfile,
} from '@/hooks/useProfile';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { RoleBadge } from './RoleBadge';

// =============================================================================
// Types
// =============================================================================

export interface UserFormProps {
  /** User ID to edit */
  userId: string;
  /** Called when form is submitted successfully */
  onSuccess?: () => void;
  /** Called when cancel is clicked */
  onCancel?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Schema
// =============================================================================

const userFormSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  role: z.enum(['admin', 'user', 'viewer']),
});

type UserFormData = z.infer<typeof userFormSchema>;

// =============================================================================
// Icons
// =============================================================================

function UserIcon() {
  return (
    <svg className="w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

export function UserForm({
  userId,
  onSuccess,
  onCancel,
  className = '',
}: UserFormProps) {
  const { data: user, isLoading, error } = useProfile(userId);
  const { data: currentUser } = useCurrentProfile();
  const updateProfile = useUpdateProfile();
  const updateRole = useUpdateUserRole();
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      displayName: '',
      phone: '',
      role: 'viewer',
    },
  });

  const selectedRole = watch('role');

  // Populate form when user data loads
  useEffect(() => {
    if (user) {
      reset({
        displayName: user.displayName || '',
        phone: user.phone || '',
        role: user.role,
      });
    }
  }, [user, reset]);

  // Check if current user can edit this user
  const isEditingSelf = currentUser?.id === userId;
  const canEditRole = currentUser?.role === 'admin' && !isEditingSelf;
  const canToggleStatus = currentUser?.role === 'admin' && !isEditingSelf;

  // Handle form submission
  const onSubmit = async (data: UserFormData) => {
    try {
      // Update profile fields
      await updateProfile.mutateAsync({
        id: userId,
        input: {
          displayName: data.displayName,
          phone: data.phone || null,
        },
      });

      // Update role if changed and allowed
      if (canEditRole && user && data.role !== user.role) {
        await updateRole.mutateAsync({
          userId,
          role: data.role as UserRole,
        });
      }

      onSuccess?.();
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  // Handle status toggle
  const handleToggleStatus = async () => {
    if (!user) return;

    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(userId);
      } else {
        await reactivateUser.mutateAsync(userId);
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <div className="p-8 text-center text-gray-500">Loading user...</div>
      </Card>
    );
  }

  // Error state
  if (error || !user) {
    return (
      <Card className={className}>
        <div className="p-8 text-center text-[#d32f2f]">
          Failed to load user. Please try again.
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader
        actions={
          <div className="flex items-center gap-2">
            <RoleBadge role={user.role} size="md" />
            {user.isActive ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-[#2e7d32] bg-[#2e7d32]/10 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-[#2e7d32] rounded-full" />
                Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                Inactive
              </span>
            )}
          </div>
        }
      >
        Edit User
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="p-6 space-y-6">
          {/* User Avatar & Email */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#f5f5f5] rounded-full flex items-center justify-center overflow-hidden">
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
              <div className="font-medium text-[#003559] text-lg">
                {user.displayName || user.email.split('@')[0]}
              </div>
              <div className="text-gray-500">{user.email}</div>
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Display Name
            </label>
            <Input
              id="displayName"
              {...register('displayName')}
              error={errors.displayName?.message}
              placeholder="Enter display name"
            />
          </div>

          {/* Phone */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Phone Number
            </label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              error={errors.phone?.message}
              placeholder="+1 (555) 123-4567"
            />
          </div>

          {/* Role */}
          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Role
            </label>
            {canEditRole ? (
              <>
                <Select
                  id="role"
                  {...register('role')}
                  options={(['admin', 'user', 'viewer'] as UserRole[]).map((role) => ({
                    value: role,
                    label: ROLE_LABELS[role],
                  }))}
                  hideLabel
                />
                <p id="role-description" className="mt-1 text-sm text-gray-500">
                  {ROLE_DESCRIPTIONS[selectedRole as UserRole]}
                </p>
              </>
            ) : (
              <div className="py-2">
                <RoleBadge role={user.role} size="md" />
                <p className="mt-1 text-sm text-gray-500">
                  {isEditingSelf
                    ? 'You cannot change your own role'
                    : 'Only administrators can change user roles'}
                </p>
              </div>
            )}
          </div>

          {/* Account Info */}
          <div className="border-t border-[#e0e0e0] pt-6">
            <h3 className="text-sm font-medium text-gray-700 mb-4">
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Created</span>
                <div className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Last Login</span>
                <div className="font-medium">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          {canToggleStatus && (
            <div className="border-t border-[#e0e0e0] pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Account Status
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {user.isActive
                  ? 'Deactivating this user will prevent them from logging in.'
                  : 'Reactivating this user will allow them to log in again.'}
              </p>
              <Button
                type="button"
                variant={user.isActive ? 'danger' : 'primary'}
                onClick={handleToggleStatus}
                loading={deactivateUser.isPending || reactivateUser.isPending}
              >
                {user.isActive ? 'Deactivate User' : 'Reactivate User'}
              </Button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f5f5f5] border-t border-[#e0e0e0] flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting || updateProfile.isPending || updateRole.isPending}
            disabled={!isDirty}
            leftIcon={<CheckIcon />}
          >
            Save Changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default UserForm;
