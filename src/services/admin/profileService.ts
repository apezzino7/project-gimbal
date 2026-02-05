/**
 * Profile Service
 * CRUD operations and queries for user profiles and RBAC
 */

import { supabase } from '@/lib/supabase';
import type {
  Profile,
  ProfileWithStats,
  UpdateProfileInput,
  ProfileSearchParams,
  ProfileRow,
  UserRole,
} from '@/types/admin';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function ProfileServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'ProfileServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Row Mapper (local since we import types only)
// =============================================================================

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    phone: row.phone,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Profile CRUD Operations
// =============================================================================

/**
 * Get all profiles with optional filters
 */
export async function getProfiles(params?: ProfileSearchParams): Promise<Profile[]> {
  let query = supabase
    .from('profiles')
    .select('*')
    .order(params?.sortBy ?? 'created_at', {
      ascending: params?.sortOrder === 'asc'
    });

  if (params?.search) {
    query = query.or(
      `email.ilike.%${params.search}%,display_name.ilike.%${params.search}%`
    );
  }

  if (params?.role) {
    query = query.eq('role', params.role);
  }

  if (params?.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(
      params.offset,
      params.offset + (params?.limit || 50) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    throw ProfileServiceError('Failed to fetch profiles', error);
  }

  return (data || []).map(toProfile);
}

/**
 * Get a single profile by ID
 */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw ProfileServiceError('Failed to fetch profile', error);
  }

  return data ? toProfile(data) : null;
}

/**
 * Get the current user's profile
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return getProfileById(user.id);
}

/**
 * Get the current user's role
 */
export async function getCurrentRole(): Promise<UserRole | null> {
  const { data, error } = await supabase.rpc('get_user_role');

  if (error) {
    console.error('Failed to get user role:', error);
    return null;
  }

  return data as UserRole | null;
}

/**
 * Check if current user has required role
 */
export async function hasRole(requiredRole: UserRole): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_role', {
    required_role: requiredRole,
  });

  if (error) {
    console.error('Failed to check role:', error);
    return false;
  }

  return data === true;
}

/**
 * Get profile with additional stats
 */
export async function getProfileWithStats(id: string): Promise<ProfileWithStats | null> {
  const profile = await getProfileById(id);
  if (!profile) return null;

  // Get campaign count for this user
  const { count: campaignCount } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id);

  return {
    ...profile,
    campaignCount: campaignCount ?? 0,
  };
}

/**
 * Update a profile
 */
export async function updateProfile(
  id: string,
  input: UpdateProfileInput
): Promise<Profile> {
  const updateData: Record<string, unknown> = {};

  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw ProfileServiceError('Failed to update profile', error);
  }

  return toProfile(data);
}

/**
 * Update the current user's profile (non-admin fields only)
 */
export async function updateCurrentProfile(
  input: Pick<UpdateProfileInput, 'displayName' | 'avatarUrl' | 'phone'>
): Promise<Profile> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw ProfileServiceError('Not authenticated');

  const updateData: Record<string, unknown> = {};

  if (input.displayName !== undefined) updateData.display_name = input.displayName;
  if (input.avatarUrl !== undefined) updateData.avatar_url = input.avatarUrl;
  if (input.phone !== undefined) updateData.phone = input.phone;

  const { data, error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    throw ProfileServiceError('Failed to update profile', error);
  }

  return toProfile(data);
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(userId: string, role: UserRole): Promise<Profile> {
  // This will be protected by RLS - only admins can update roles
  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw ProfileServiceError('Failed to update user role', error);
  }

  return toProfile(data);
}

/**
 * Deactivate a user (admin only)
 */
export async function deactivateUser(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw ProfileServiceError('Failed to deactivate user', error);
  }

  return toProfile(data);
}

/**
 * Reactivate a user (admin only)
 */
export async function reactivateUser(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: true })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw ProfileServiceError('Failed to reactivate user', error);
  }

  return toProfile(data);
}

/**
 * Update last login timestamp
 */
export async function updateLastLogin(): Promise<void> {
  const { error } = await supabase.rpc('update_last_login');

  if (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * Get total count of profiles
 */
export async function getProfileCount(params?: {
  role?: UserRole;
  isActive?: boolean;
}): Promise<number> {
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  if (params?.role) {
    query = query.eq('role', params.role);
  }

  if (params?.isActive !== undefined) {
    query = query.eq('is_active', params.isActive);
  }

  const { count, error } = await query;

  if (error) {
    throw ProfileServiceError('Failed to count profiles', error);
  }

  return count ?? 0;
}

/**
 * Get profile statistics
 */
export async function getProfileStats(): Promise<{
  total: number;
  active: number;
  inactive: number;
  byRole: Record<UserRole, number>;
}> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, is_active');

  if (error) {
    throw ProfileServiceError('Failed to fetch profile stats', error);
  }

  const stats = {
    total: data?.length ?? 0,
    active: 0,
    inactive: 0,
    byRole: {
      admin: 0,
      user: 0,
      viewer: 0,
    } as Record<UserRole, number>,
  };

  for (const profile of data || []) {
    if (profile.is_active) {
      stats.active++;
    } else {
      stats.inactive++;
    }
    const role = profile.role as UserRole;
    if (role in stats.byRole) {
      stats.byRole[role]++;
    }
  }

  return stats;
}

// =============================================================================
// Exports
// =============================================================================

export const profileService = {
  // Queries
  getProfiles,
  getProfileById,
  getCurrentProfile,
  getCurrentRole,
  hasRole,
  getProfileWithStats,
  getProfileCount,
  getProfileStats,

  // Mutations
  updateProfile,
  updateCurrentProfile,
  updateUserRole,
  deactivateUser,
  reactivateUser,
  updateLastLogin,
};

export default profileService;
