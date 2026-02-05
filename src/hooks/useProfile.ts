/**
 * useProfile Hook
 * React Query hooks for profile and admin functionality
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '@/services/admin/profileService';
import { appSettingsService } from '@/services/admin/appSettingsService';
import { profileKeys, appSettingsKeys, auditKeys } from '@/lib/queryKeys';
import type {
  ProfileSearchParams,
  UpdateProfileInput,
  UserRole,
  UpdateAppSettingsInput,
  AuditLogSearchParams,
} from '@/types/admin';

// =============================================================================
// Profile Queries
// =============================================================================

/**
 * Get the current user's profile
 */
export function useCurrentProfile() {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: () => profileService.getCurrentProfile(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get the current user's role
 */
export function useCurrentRole() {
  return useQuery({
    queryKey: profileKeys.currentRole(),
    queryFn: () => profileService.getCurrentRole(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get all profiles (admin only)
 */
export function useProfiles(params?: ProfileSearchParams) {
  return useQuery({
    queryKey: profileKeys.list(params),
    queryFn: () => profileService.getProfiles(params),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get a single profile by ID
 */
export function useProfile(id: string | undefined) {
  return useQuery({
    queryKey: profileKeys.detail(id || ''),
    queryFn: () => profileService.getProfileById(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get profile with stats
 */
export function useProfileWithStats(id: string | undefined) {
  return useQuery({
    queryKey: [...profileKeys.detail(id || ''), 'stats'],
    queryFn: () => profileService.getProfileWithStats(id!),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get profile statistics
 */
export function useProfileStats() {
  return useQuery({
    queryKey: profileKeys.stats(),
    queryFn: () => profileService.getProfileStats(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// =============================================================================
// Profile Mutations
// =============================================================================

/**
 * Update current user's profile
 */
export function useUpdateCurrentProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Pick<UpdateProfileInput, 'displayName' | 'avatarUrl' | 'phone'>) =>
      profileService.updateCurrentProfile(input),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.current(), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
    },
  });
}

/**
 * Update any profile (admin only)
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProfileInput }) =>
      profileService.updateProfile(id, input),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.detail(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.stats() });
    },
  });
}

/**
 * Update user role (admin only)
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      profileService.updateUserRole(userId, role),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.detail(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.stats() });
    },
  });
}

/**
 * Deactivate user (admin only)
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profileService.deactivateUser(userId),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.detail(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.stats() });
    },
  });
}

/**
 * Reactivate user (admin only)
 */
export function useReactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => profileService.reactivateUser(userId),
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData(profileKeys.detail(updatedProfile.id), updatedProfile);
      queryClient.invalidateQueries({ queryKey: profileKeys.lists() });
      queryClient.invalidateQueries({ queryKey: profileKeys.stats() });
    },
  });
}

// =============================================================================
// App Settings Queries
// =============================================================================

/**
 * Get app settings (masked for display)
 */
export function useAppSettings() {
  return useQuery({
    queryKey: appSettingsKeys.masked(),
    queryFn: () => appSettingsService.getAppSettingsMasked(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get messaging configuration status
 */
export function useMessagingStatus() {
  return useQuery({
    queryKey: appSettingsKeys.messagingStatus(),
    queryFn: () => appSettingsService.getMessagingStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// App Settings Mutations
// =============================================================================

/**
 * Update app settings (admin only)
 */
export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateAppSettingsInput) =>
      appSettingsService.updateAppSettings(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appSettingsKeys.all });
    },
  });
}

// =============================================================================
// Audit Log Queries
// =============================================================================

/**
 * Get audit logs
 */
export function useAuditLogs(params?: AuditLogSearchParams) {
  return useQuery({
    queryKey: auditKeys.logs(params),
    queryFn: () => appSettingsService.getAuditLogs(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Get audit log statistics
 */
export function useAuditLogStats(days: number = 7) {
  return useQuery({
    queryKey: auditKeys.stats(days),
    queryFn: () => appSettingsService.getAuditLogStats(days),
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Get unique audit event types
 */
export function useAuditEventTypes() {
  return useQuery({
    queryKey: auditKeys.eventTypes(),
    queryFn: () => appSettingsService.getAuditEventTypes(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// Permission Helpers
// =============================================================================

/**
 * Hook to check if current user has a minimum role
 */
export function useHasRole(requiredRole: UserRole) {
  const { data: currentRole, isLoading } = useCurrentRole();

  if (isLoading || !currentRole) {
    return { hasRole: false, isLoading };
  }

  const roleHierarchy: Record<UserRole, number> = {
    admin: 3,
    user: 2,
    viewer: 1,
  };

  return {
    hasRole: roleHierarchy[currentRole] >= roleHierarchy[requiredRole],
    isLoading: false,
  };
}

/**
 * Hook to check if current user is an admin
 */
export function useIsAdmin() {
  const { data: currentRole, isLoading } = useCurrentRole();

  return {
    isAdmin: currentRole === 'admin',
    isLoading,
  };
}
