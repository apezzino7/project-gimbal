/**
 * Site Service
 * CRUD operations and hierarchy management for sites
 */

import { supabase } from '@/lib/supabase';
import type {
  Site,
  CreateSiteInput,
  UpdateSiteInput,
  SiteWithHierarchy,
  SiteStats,
  MembershipLevel,
  CreateMembershipLevelInput,
  UpdateMembershipLevelInput,
} from '@/types/member';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function SiteServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'SiteServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Site CRUD Operations
// =============================================================================

/**
 * Get all sites for the current user
 */
export async function getSites(): Promise<Site[]> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .order('site_level', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw SiteServiceError('Failed to fetch sites', error);
  }

  return (data || []).map(transformSite);
}

/**
 * Get a single site by ID
 */
export async function getSiteById(id: string): Promise<Site | null> {
  const { data, error } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw SiteServiceError('Failed to fetch site', error);
  }

  return data ? transformSite(data) : null;
}

/**
 * Create a new site
 */
export async function createSite(input: CreateSiteInput): Promise<Site> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw SiteServiceError('Not authenticated');

  const { data, error } = await supabase
    .from('sites')
    .insert({
      user_id: user.id,
      name: input.name,
      code: input.code,
      parent_site_id: input.parentSiteId ?? null,
      site_level: input.siteLevel ?? 'site',
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postalCode ?? null,
      country: input.country ?? 'US',
      timezone: input.timezone ?? 'America/New_York',
      phone: input.phone ?? null,
      email: input.email ?? null,
      default_acquisition_cost: input.defaultAcquisitionCost ?? 0,
    })
    .select()
    .single();

  if (error) {
    throw SiteServiceError('Failed to create site', error);
  }

  return transformSite(data);
}

/**
 * Update an existing site
 */
export async function updateSite(id: string, input: UpdateSiteInput): Promise<Site> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.parentSiteId !== undefined) updateData.parent_site_id = input.parentSiteId;
  if (input.siteLevel !== undefined) updateData.site_level = input.siteLevel;
  if (input.addressLine1 !== undefined) updateData.address_line1 = input.addressLine1;
  if (input.addressLine2 !== undefined) updateData.address_line2 = input.addressLine2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.timezone !== undefined) updateData.timezone = input.timezone;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.defaultAcquisitionCost !== undefined) updateData.default_acquisition_cost = input.defaultAcquisitionCost;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('sites')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw SiteServiceError('Failed to update site', error);
  }

  return transformSite(data);
}

/**
 * Delete a site (soft delete by setting is_active = false)
 */
export async function deleteSite(id: string): Promise<void> {
  const { error } = await supabase
    .from('sites')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw SiteServiceError('Failed to delete site', error);
  }
}

/**
 * Hard delete a site (permanent)
 */
export async function hardDeleteSite(id: string): Promise<void> {
  const { error } = await supabase
    .from('sites')
    .delete()
    .eq('id', id);

  if (error) {
    throw SiteServiceError('Failed to delete site', error);
  }
}

// =============================================================================
// Site Hierarchy
// =============================================================================

/**
 * Get sites organized as a hierarchy tree
 */
export async function getSiteHierarchy(): Promise<SiteWithHierarchy[]> {
  const sites = await getSites();
  return buildHierarchy(sites);
}

/**
 * Get a site with all its children (recursive)
 */
export async function getSiteWithChildren(siteId: string): Promise<SiteWithHierarchy | null> {
  const { data, error } = await supabase
    .rpc('get_site_hierarchy', { p_site_id: siteId });

  if (error) {
    throw SiteServiceError('Failed to fetch site hierarchy', error);
  }

  if (!data || data.length === 0) return null;

  const sites = await getSites();
  const siteMap = new Map(sites.map(s => [s.id, s]));

  // Build tree from flat result
  const result: SiteWithHierarchy[] = [];
  const nodeMap = new Map<string, SiteWithHierarchy>();

  for (const row of data) {
    const site = siteMap.get(row.id);
    if (!site) continue;

    const node: SiteWithHierarchy = { ...site, depth: row.depth, children: [] };
    nodeMap.set(row.id, node);

    if (row.depth === 0) {
      result.push(node);
    } else {
      // Find parent from previous levels
      const parent = nodeMap.get(site.parentSiteId || '');
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    }
  }

  return result[0] || null;
}

/**
 * Get all child site IDs for a given site (recursive)
 */
export async function getChildSiteIds(siteId: string): Promise<string[]> {
  const { data, error } = await supabase
    .rpc('get_site_hierarchy', { p_site_id: siteId });

  if (error) {
    throw SiteServiceError('Failed to fetch child sites', error);
  }

  return (data || []).map((row: { id: string }) => row.id);
}

// =============================================================================
// Site Statistics
// =============================================================================

/**
 * Get statistics for a site
 */
export async function getSiteStats(siteId: string, includeChildren = false): Promise<SiteStats> {
  // Get member count
  const { data: memberCount, error: memberError } = await supabase
    .rpc('get_site_member_count', {
      p_site_id: siteId,
      p_include_children: includeChildren,
    });

  if (memberError) {
    throw SiteServiceError('Failed to fetch member count', memberError);
  }

  // Get active members
  let query = supabase
    .from('members')
    .select('lifetime_value', { count: 'exact' })
    .eq('is_active', true)
    .eq('membership_status', 'active');

  if (includeChildren) {
    const childIds = await getChildSiteIds(siteId);
    query = query.in('site_id', childIds);
  } else {
    query = query.eq('site_id', siteId);
  }

  const { data: members, count: activeCount, error: activeError } = await query;

  if (activeError) {
    throw SiteServiceError('Failed to fetch active members', activeError);
  }

  // Calculate totals
  const totalRevenue = members?.reduce((sum, m) => sum + (m.lifetime_value || 0), 0) || 0;
  const avgLtv = activeCount ? totalRevenue / activeCount : 0;

  return {
    totalMembers: memberCount || 0,
    activeMembers: activeCount || 0,
    totalRevenue,
    avgLtv,
  };
}

/**
 * Get transaction summary for a site
 */
export async function getSiteTransactionSummary(
  siteId: string,
  includeChildren = false,
  startDate?: string,
  endDate?: string
) {
  const { data, error } = await supabase
    .rpc('get_site_transaction_summary', {
      p_site_id: siteId,
      p_include_children: includeChildren,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

  if (error) {
    throw SiteServiceError('Failed to fetch transaction summary', error);
  }

  return data?.[0] || {
    total_revenue: 0,
    total_refunds: 0,
    net_revenue: 0,
    transaction_count: 0,
    average_transaction: 0,
    unique_members: 0,
  };
}

// =============================================================================
// Membership Levels
// =============================================================================

/**
 * Get all membership levels for a site
 */
export async function getMembershipLevels(siteId: string): Promise<MembershipLevel[]> {
  const { data, error } = await supabase
    .from('membership_levels')
    .select('*')
    .eq('site_id', siteId)
    .order('display_order', { ascending: true });

  if (error) {
    throw SiteServiceError('Failed to fetch membership levels', error);
  }

  return (data || []).map(transformMembershipLevel);
}

/**
 * Get a single membership level by ID
 */
export async function getMembershipLevelById(id: string): Promise<MembershipLevel | null> {
  const { data, error } = await supabase
    .from('membership_levels')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw SiteServiceError('Failed to fetch membership level', error);
  }

  return data ? transformMembershipLevel(data) : null;
}

/**
 * Create a new membership level
 */
export async function createMembershipLevel(input: CreateMembershipLevelInput): Promise<MembershipLevel> {
  const { data, error } = await supabase
    .from('membership_levels')
    .insert({
      site_id: input.siteId,
      name: input.name,
      code: input.code,
      display_order: input.displayOrder ?? 0,
      benefits: input.benefits ?? {},
      min_lifetime_value: input.minLifetimeValue ?? null,
      min_visit_count: input.minVisitCount ?? null,
    })
    .select()
    .single();

  if (error) {
    throw SiteServiceError('Failed to create membership level', error);
  }

  return transformMembershipLevel(data);
}

/**
 * Update an existing membership level
 */
export async function updateMembershipLevel(
  id: string,
  input: UpdateMembershipLevelInput
): Promise<MembershipLevel> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.code !== undefined) updateData.code = input.code;
  if (input.displayOrder !== undefined) updateData.display_order = input.displayOrder;
  if (input.benefits !== undefined) updateData.benefits = input.benefits;
  if (input.minLifetimeValue !== undefined) updateData.min_lifetime_value = input.minLifetimeValue;
  if (input.minVisitCount !== undefined) updateData.min_visit_count = input.minVisitCount;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('membership_levels')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw SiteServiceError('Failed to update membership level', error);
  }

  return transformMembershipLevel(data);
}

/**
 * Delete a membership level
 */
export async function deleteMembershipLevel(id: string): Promise<void> {
  const { error } = await supabase
    .from('membership_levels')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw SiteServiceError('Failed to delete membership level', error);
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function transformSite(row: Record<string, unknown>): Site {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    code: row.code as string,
    parentSiteId: row.parent_site_id as string | null,
    siteLevel: row.site_level as Site['siteLevel'],
    addressLine1: row.address_line1 as string | null,
    addressLine2: row.address_line2 as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    postalCode: row.postal_code as string | null,
    country: row.country as string,
    timezone: row.timezone as string,
    phone: row.phone as string | null,
    email: row.email as string | null,
    defaultAcquisitionCost: Number(row.default_acquisition_cost) || 0,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformMembershipLevel(row: Record<string, unknown>): MembershipLevel {
  return {
    id: row.id as string,
    siteId: row.site_id as string,
    name: row.name as string,
    code: row.code as string,
    displayOrder: row.display_order as number,
    benefits: row.benefits as MembershipLevel['benefits'],
    minLifetimeValue: row.min_lifetime_value as number | null,
    minVisitCount: row.min_visit_count as number | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

function buildHierarchy(sites: Site[]): SiteWithHierarchy[] {
  const siteMap = new Map<string, SiteWithHierarchy>();
  const roots: SiteWithHierarchy[] = [];

  // Create nodes
  for (const site of sites) {
    siteMap.set(site.id, { ...site, children: [] });
  }

  // Build tree
  for (const site of sites) {
    const node = siteMap.get(site.id)!;
    if (site.parentSiteId && siteMap.has(site.parentSiteId)) {
      const parent = siteMap.get(site.parentSiteId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// =============================================================================
// Exports
// =============================================================================

export const siteService = {
  // Sites
  getSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  hardDeleteSite,

  // Hierarchy
  getSiteHierarchy,
  getSiteWithChildren,
  getChildSiteIds,

  // Statistics
  getSiteStats,
  getSiteTransactionSummary,

  // Membership Levels
  getMembershipLevels,
  getMembershipLevelById,
  createMembershipLevel,
  updateMembershipLevel,
  deleteMembershipLevel,
};

export default siteService;
