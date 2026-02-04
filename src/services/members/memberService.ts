/**
 * Member Service
 * CRUD operations, search, and analytics for members
 */

import { supabase } from '@/lib/supabase';
import type {
  Member,
  MemberWithDetails,
  CreateMemberInput,
  UpdateMemberInput,
  MemberSearchParams,
  MemberSearchResult,
  MemberTransaction,
  CreateTransactionInput,
  LtvBreakdown,
  MemberVisit,
  CreateVisitInput,
  VisitStats,
  MemberConsent,
  CreateConsentInput,
  UpdateConsentInput,
  ConsentCheckResult,
} from '@/types/member';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function MemberServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'MemberServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Member CRUD Operations
// =============================================================================

/**
 * Get all members for the current user with optional filters
 */
export async function getMembers(params?: {
  siteId?: string;
  limit?: number;
  offset?: number;
}): Promise<Member[]> {
  let query = supabase
    .from('members')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (params?.siteId) {
    query = query.eq('site_id', params.siteId);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params?.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw MemberServiceError('Failed to fetch members', error);
  }

  return (data || []).map(transformMember);
}

/**
 * Get a single member by ID
 */
export async function getMemberById(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MemberServiceError('Failed to fetch member', error);
  }

  return data ? transformMember(data) : null;
}

/**
 * Get a member with all related details
 */
export async function getMemberWithDetails(id: string): Promise<MemberWithDetails | null> {
  const { data, error } = await supabase
    .from('members')
    .select(`
      *,
      sites (*),
      membership_levels (*),
      member_consent (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MemberServiceError('Failed to fetch member details', error);
  }

  if (!data) return null;

  return {
    ...transformMember(data),
    site: data.sites ? transformSite(data.sites) : undefined,
    membershipLevel: data.membership_levels ? transformMembershipLevel(data.membership_levels) : undefined,
    consent: data.member_consent ? transformConsent(data.member_consent) : undefined,
  };
}

/**
 * Create a new member
 */
export async function createMember(input: CreateMemberInput): Promise<Member> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw MemberServiceError('Not authenticated');

  const { data, error } = await supabase
    .from('members')
    .insert({
      user_id: user.id,
      site_id: input.siteId,
      membership_level_id: input.membershipLevelId ?? null,
      external_id: input.externalId ?? null,
      first_name: input.firstName ?? null,
      last_name: input.lastName ?? null,
      email: input.email ? input.email.toLowerCase().trim() : null,
      phone: input.phone ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      gender: input.gender ?? null,
      address_line1: input.addressLine1 ?? null,
      address_line2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postal_code: input.postalCode ?? null,
      country: input.country ?? 'US',
      membership_start_date: input.membershipStartDate ?? null,
      membership_expiry_date: input.membershipExpiryDate ?? null,
      membership_status: input.membershipStatus ?? 'active',
      acquisition_source: input.acquisitionSource ?? null,
      acquisition_campaign_id: input.acquisitionCampaignId ?? null,
      acquisition_promo_code: input.acquisitionPromoCode ?? null,
      acquisition_cost: input.acquisitionCost ?? null,
      acquisition_date: input.acquisitionDate ?? new Date().toISOString().split('T')[0],
      tags: input.tags ?? [],
      custom_fields: input.customFields ?? {},
      source_import_id: input.sourceImportId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to create member', error);
  }

  return transformMember(data);
}

/**
 * Update an existing member
 */
export async function updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
  const updateData: Record<string, unknown> = {};

  if (input.membershipLevelId !== undefined) updateData.membership_level_id = input.membershipLevelId;
  if (input.externalId !== undefined) updateData.external_id = input.externalId;
  if (input.firstName !== undefined) updateData.first_name = input.firstName;
  if (input.lastName !== undefined) updateData.last_name = input.lastName;
  if (input.email !== undefined) updateData.email = input.email?.toLowerCase().trim() ?? null;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.dateOfBirth !== undefined) updateData.date_of_birth = input.dateOfBirth;
  if (input.gender !== undefined) updateData.gender = input.gender;
  if (input.addressLine1 !== undefined) updateData.address_line1 = input.addressLine1;
  if (input.addressLine2 !== undefined) updateData.address_line2 = input.addressLine2;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.postalCode !== undefined) updateData.postal_code = input.postalCode;
  if (input.country !== undefined) updateData.country = input.country;
  if (input.membershipStartDate !== undefined) updateData.membership_start_date = input.membershipStartDate;
  if (input.membershipExpiryDate !== undefined) updateData.membership_expiry_date = input.membershipExpiryDate;
  if (input.membershipStatus !== undefined) updateData.membership_status = input.membershipStatus;
  if (input.acquisitionSource !== undefined) updateData.acquisition_source = input.acquisitionSource;
  if (input.acquisitionCampaignId !== undefined) updateData.acquisition_campaign_id = input.acquisitionCampaignId;
  if (input.acquisitionPromoCode !== undefined) updateData.acquisition_promo_code = input.acquisitionPromoCode;
  if (input.acquisitionCost !== undefined) updateData.acquisition_cost = input.acquisitionCost;
  if (input.acquisitionDate !== undefined) updateData.acquisition_date = input.acquisitionDate;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.customFields !== undefined) updateData.custom_fields = input.customFields;
  if (input.sourceImportId !== undefined) updateData.source_import_id = input.sourceImportId;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('members')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to update member', error);
  }

  return transformMember(data);
}

/**
 * Delete a member (soft delete)
 */
export async function deleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw MemberServiceError('Failed to delete member', error);
  }
}

/**
 * Hard delete a member (permanent)
 */
export async function hardDeleteMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('members')
    .delete()
    .eq('id', id);

  if (error) {
    throw MemberServiceError('Failed to delete member', error);
  }
}

// =============================================================================
// Member Search
// =============================================================================

/**
 * Search members with filters
 */
export async function searchMembers(params: MemberSearchParams): Promise<MemberSearchResult[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw MemberServiceError('Not authenticated');

  const { data, error } = await supabase
    .rpc('search_members', {
      p_user_id: user.id,
      p_site_id: params.siteId ?? null,
      p_search_term: params.searchTerm ?? null,
      p_membership_status: params.membershipStatus ?? null,
      p_membership_level_id: params.membershipLevelId ?? null,
      p_tags: params.tags ?? null,
      p_limit: params.limit ?? 50,
      p_offset: params.offset ?? 0,
    });

  if (error) {
    throw MemberServiceError('Failed to search members', error);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    membershipStatus: row.membership_status as Member['membershipStatus'],
    membershipLevelName: row.membership_level_name as string | null,
    lifetimeValue: Number(row.lifetime_value) || 0,
    totalVisits: row.total_visits as number,
    lastVisitAt: row.last_visit_at as string | null,
    siteName: row.site_name as string,
    createdAt: row.created_at as string,
  }));
}

/**
 * Find a member by email or phone (for duplicate detection)
 */
export async function findMemberByContact(
  siteId: string,
  email?: string | null,
  phone?: string | null,
  externalId?: string | null
): Promise<Member | null> {
  if (!email && !phone && !externalId) return null;

  let query = supabase
    .from('members')
    .select('*')
    .eq('site_id', siteId)
    .eq('is_active', true);

  // Build OR conditions
  const conditions: string[] = [];
  if (email) conditions.push(`email.eq.${email.toLowerCase().trim()}`);
  if (phone) conditions.push(`phone.eq.${phone}`);
  if (externalId) conditions.push(`external_id.eq.${externalId}`);

  if (conditions.length === 1) {
    // Single condition
    if (email) query = query.eq('email', email.toLowerCase().trim());
    else if (phone) query = query.eq('phone', phone);
    else if (externalId) query = query.eq('external_id', externalId);
  } else {
    // Multiple conditions - use OR
    query = query.or(conditions.join(','));
  }

  const { data, error } = await query.limit(1).single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MemberServiceError('Failed to find member', error);
  }

  return data ? transformMember(data) : null;
}

// =============================================================================
// Transactions
// =============================================================================

/**
 * Get transactions for a member
 */
export async function getMemberTransactions(memberId: string): Promise<MemberTransaction[]> {
  const { data, error } = await supabase
    .from('member_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('transaction_date', { ascending: false });

  if (error) {
    throw MemberServiceError('Failed to fetch transactions', error);
  }

  return (data || []).map(transformTransaction);
}

/**
 * Create a transaction
 */
export async function createTransaction(input: CreateTransactionInput): Promise<MemberTransaction> {
  const { data, error } = await supabase
    .from('member_transactions')
    .insert({
      member_id: input.memberId,
      site_id: input.siteId,
      external_transaction_id: input.externalTransactionId ?? null,
      transaction_date: input.transactionDate,
      amount: input.amount,
      transaction_type: input.transactionType ?? 'purchase',
      promo_code: input.promoCode ?? null,
      campaign_id: input.campaignId ?? null,
      description: input.description ?? null,
      line_items: input.lineItems ?? [],
      metadata: input.metadata ?? {},
      source_import_id: input.sourceImportId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to create transaction', error);
  }

  return transformTransaction(data);
}

/**
 * Get LTV breakdown for a member
 */
export async function getLtvBreakdown(memberId: string): Promise<LtvBreakdown[]> {
  const { data, error } = await supabase
    .rpc('get_member_ltv_breakdown', { p_member_id: memberId });

  if (error) {
    throw MemberServiceError('Failed to fetch LTV breakdown', error);
  }

  return (data || []).map((row: Record<string, unknown>) => ({
    transactionType: row.transaction_type as LtvBreakdown['transactionType'],
    totalAmount: Number(row.total_amount) || 0,
    transactionCount: Number(row.transaction_count) || 0,
    firstTransaction: row.first_transaction as string,
    lastTransaction: row.last_transaction as string,
  }));
}

// =============================================================================
// Visits
// =============================================================================

/**
 * Get visits for a member
 */
export async function getMemberVisits(memberId: string): Promise<MemberVisit[]> {
  const { data, error } = await supabase
    .from('member_visits')
    .select('*')
    .eq('member_id', memberId)
    .order('visit_date', { ascending: false });

  if (error) {
    throw MemberServiceError('Failed to fetch visits', error);
  }

  return (data || []).map(transformVisit);
}

/**
 * Create a visit
 */
export async function createVisit(input: CreateVisitInput): Promise<MemberVisit> {
  const { data, error } = await supabase
    .from('member_visits')
    .insert({
      member_id: input.memberId,
      site_id: input.siteId,
      visit_date: input.visitDate,
      check_in_time: input.checkInTime ?? null,
      check_out_time: input.checkOutTime ?? null,
      visit_type: input.visitType ?? 'regular',
      service_name: input.serviceName ?? null,
      staff_member: input.staffMember ?? null,
      notes: input.notes ?? null,
      metadata: input.metadata ?? {},
      source_import_id: input.sourceImportId ?? null,
    })
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to create visit', error);
  }

  return transformVisit(data);
}

/**
 * Get visit statistics for a member
 */
export async function getVisitStats(memberId: string): Promise<VisitStats | null> {
  const { data, error } = await supabase
    .rpc('get_member_visit_stats', { p_member_id: memberId });

  if (error) {
    throw MemberServiceError('Failed to fetch visit stats', error);
  }

  const row = data?.[0];
  if (!row) return null;

  return {
    totalVisits: Number(row.total_visits) || 0,
    visitsThisMonth: Number(row.visits_this_month) || 0,
    visitsLastMonth: Number(row.visits_last_month) || 0,
    visitsThisYear: Number(row.visits_this_year) || 0,
    avgVisitsPerMonth: Number(row.avg_visits_per_month) || 0,
    firstVisit: row.first_visit as string | null,
    lastVisit: row.last_visit as string | null,
    mostCommonVisitType: row.most_common_visit_type as VisitStats['mostCommonVisitType'],
  };
}

// =============================================================================
// Consent Management
// =============================================================================

/**
 * Get consent for a member
 */
export async function getMemberConsent(memberId: string): Promise<MemberConsent | null> {
  const { data, error } = await supabase
    .from('member_consent')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MemberServiceError('Failed to fetch consent', error);
  }

  return data ? transformConsent(data) : null;
}

/**
 * Create or update consent for a member
 */
export async function upsertConsent(input: CreateConsentInput): Promise<MemberConsent> {
  const { data, error } = await supabase
    .from('member_consent')
    .upsert({
      member_id: input.memberId,
      sms_consent: input.smsConsent ?? false,
      sms_consent_source: input.smsConsentSource ?? null,
      sms_consented_at: input.smsConsent ? new Date().toISOString() : null,
      sms_consent_ip: input.smsConsentIp ?? null,
      email_consent: input.emailConsent ?? true,
      email_consent_source: input.emailConsentSource ?? null,
      email_consented_at: input.emailConsent ? new Date().toISOString() : null,
      preferred_channel: input.preferredChannel ?? 'email',
    }, { onConflict: 'member_id' })
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to upsert consent', error);
  }

  return transformConsent(data);
}

/**
 * Update consent for a member
 */
export async function updateConsent(memberId: string, input: UpdateConsentInput): Promise<MemberConsent> {
  const updateData: Record<string, unknown> = {};

  if (input.smsConsent !== undefined) {
    updateData.sms_consent = input.smsConsent;
    if (input.smsConsent) {
      updateData.sms_consented_at = new Date().toISOString();
      updateData.sms_opt_out_at = null;
    }
  }
  if (input.smsConsentSource !== undefined) updateData.sms_consent_source = input.smsConsentSource;
  if (input.smsConsentIp !== undefined) updateData.sms_consent_ip = input.smsConsentIp;
  if (input.emailConsent !== undefined) {
    updateData.email_consent = input.emailConsent;
    if (input.emailConsent) {
      updateData.email_consented_at = new Date().toISOString();
      updateData.email_unsubscribed_at = null;
    }
  }
  if (input.emailConsentSource !== undefined) updateData.email_consent_source = input.emailConsentSource;
  if (input.preferredChannel !== undefined) updateData.preferred_channel = input.preferredChannel;
  if (input.doNotContact !== undefined) updateData.do_not_contact = input.doNotContact;

  const { data, error } = await supabase
    .from('member_consent')
    .update(updateData)
    .eq('member_id', memberId)
    .select()
    .single();

  if (error) {
    throw MemberServiceError('Failed to update consent', error);
  }

  return transformConsent(data);
}

/**
 * Check if SMS can be sent to a member
 */
export async function canSendSms(memberId: string, siteTimezone?: string): Promise<ConsentCheckResult> {
  const { data, error } = await supabase
    .rpc('can_send_sms', {
      p_member_id: memberId,
      p_site_timezone: siteTimezone ?? 'America/New_York',
    });

  if (error) {
    throw MemberServiceError('Failed to check SMS consent', error);
  }

  const row = data?.[0];
  return {
    canSend: row?.can_send ?? false,
    reason: row?.reason ?? 'Unknown error',
  };
}

/**
 * Check if email can be sent to a member
 */
export async function canSendEmail(memberId: string): Promise<ConsentCheckResult> {
  const { data, error } = await supabase
    .rpc('can_send_email', { p_member_id: memberId });

  if (error) {
    throw MemberServiceError('Failed to check email consent', error);
  }

  const row = data?.[0];
  return {
    canSend: row?.can_send ?? false,
    reason: row?.reason ?? 'Unknown error',
  };
}

// =============================================================================
// Tags Management
// =============================================================================

/**
 * Add tags to a member
 */
export async function addTags(memberId: string, tags: string[]): Promise<Member> {
  const member = await getMemberById(memberId);
  if (!member) throw MemberServiceError('Member not found');

  const newTags = [...new Set([...member.tags, ...tags])];
  return updateMember(memberId, { tags: newTags });
}

/**
 * Remove tags from a member
 */
export async function removeTags(memberId: string, tags: string[]): Promise<Member> {
  const member = await getMemberById(memberId);
  if (!member) throw MemberServiceError('Member not found');

  const newTags = member.tags.filter(t => !tags.includes(t));
  return updateMember(memberId, { tags: newTags });
}

/**
 * Get all unique tags used across members
 */
export async function getAllTags(): Promise<string[]> {
  const { data, error } = await supabase
    .from('members')
    .select('tags')
    .eq('is_active', true);

  if (error) {
    throw MemberServiceError('Failed to fetch tags', error);
  }

  const tagSet = new Set<string>();
  for (const row of data || []) {
    for (const tag of row.tags || []) {
      tagSet.add(tag);
    }
  }

  return Array.from(tagSet).sort();
}

// =============================================================================
// Helper Functions
// =============================================================================

function transformMember(row: Record<string, unknown>): Member {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    siteId: row.site_id as string,
    membershipLevelId: row.membership_level_id as string | null,
    externalId: row.external_id as string | null,
    firstName: row.first_name as string | null,
    lastName: row.last_name as string | null,
    email: row.email as string | null,
    phone: row.phone as string | null,
    dateOfBirth: row.date_of_birth as string | null,
    gender: row.gender as string | null,
    addressLine1: row.address_line1 as string | null,
    addressLine2: row.address_line2 as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    postalCode: row.postal_code as string | null,
    country: row.country as string,
    membershipStartDate: row.membership_start_date as string | null,
    membershipExpiryDate: row.membership_expiry_date as string | null,
    membershipStatus: row.membership_status as Member['membershipStatus'],
    totalVisits: row.total_visits as number,
    lastVisitAt: row.last_visit_at as string | null,
    totalTransactions: Number(row.total_transactions) || 0,
    lifetimeValue: Number(row.lifetime_value) || 0,
    averageTransaction: Number(row.average_transaction) || 0,
    acquisitionSource: row.acquisition_source as Member['acquisitionSource'],
    acquisitionCampaignId: row.acquisition_campaign_id as string | null,
    acquisitionPromoCode: row.acquisition_promo_code as string | null,
    acquisitionCost: row.acquisition_cost ? Number(row.acquisition_cost) : null,
    acquisitionDate: row.acquisition_date as string | null,
    tags: (row.tags as string[]) || [],
    customFields: (row.custom_fields as Record<string, unknown>) || {},
    sourceImportId: row.source_import_id as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformTransaction(row: Record<string, unknown>): MemberTransaction {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    siteId: row.site_id as string,
    externalTransactionId: row.external_transaction_id as string | null,
    transactionDate: row.transaction_date as string,
    amount: Number(row.amount) || 0,
    transactionType: row.transaction_type as MemberTransaction['transactionType'],
    promoCode: row.promo_code as string | null,
    campaignId: row.campaign_id as string | null,
    description: row.description as string | null,
    lineItems: (row.line_items as MemberTransaction['lineItems']) || [],
    metadata: (row.metadata as Record<string, unknown>) || {},
    sourceImportId: row.source_import_id as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformVisit(row: Record<string, unknown>): MemberVisit {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    siteId: row.site_id as string,
    visitDate: row.visit_date as string,
    checkInTime: row.check_in_time as string | null,
    checkOutTime: row.check_out_time as string | null,
    visitType: row.visit_type as MemberVisit['visitType'],
    serviceName: row.service_name as string | null,
    staffMember: row.staff_member as string | null,
    notes: row.notes as string | null,
    metadata: (row.metadata as Record<string, unknown>) || {},
    sourceImportId: row.source_import_id as string | null,
    createdAt: row.created_at as string,
  };
}

function transformConsent(row: Record<string, unknown>): MemberConsent {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    smsConsent: row.sms_consent as boolean,
    smsConsentSource: row.sms_consent_source as MemberConsent['smsConsentSource'],
    smsConsentedAt: row.sms_consented_at as string | null,
    smsConsentIp: row.sms_consent_ip as string | null,
    smsOptOutAt: row.sms_opt_out_at as string | null,
    smsOptOutReason: row.sms_opt_out_reason as string | null,
    emailConsent: row.email_consent as boolean,
    emailConsentSource: row.email_consent_source as MemberConsent['smsConsentSource'],
    emailConsentedAt: row.email_consented_at as string | null,
    emailUnsubscribedAt: row.email_unsubscribed_at as string | null,
    emailUnsubscribeReason: row.email_unsubscribe_reason as string | null,
    doNotContact: row.do_not_contact as boolean,
    preferredChannel: row.preferred_channel as MemberConsent['preferredChannel'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformSite(row: Record<string, unknown>): MemberWithDetails['site'] {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    code: row.code as string,
    parentSiteId: row.parent_site_id as string | null,
    siteLevel: row.site_level as 'company' | 'region' | 'site',
    addressLine1: row.address_line1 as string | null,
    addressLine2: row.address_line2 as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    postalCode: row.postal_code as string | null,
    country: (row.country as string) || 'US',
    timezone: row.timezone as string,
    phone: row.phone as string | null,
    email: row.email as string | null,
    defaultAcquisitionCost: Number(row.default_acquisition_cost) || 0,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function transformMembershipLevel(row: Record<string, unknown>): MemberWithDetails['membershipLevel'] {
  return {
    id: row.id as string,
    siteId: row.site_id as string,
    name: row.name as string,
    code: row.code as string,
    displayOrder: row.display_order as number,
    benefits: row.benefits as Record<string, unknown>,
    minLifetimeValue: row.min_lifetime_value as number | null,
    minVisitCount: row.min_visit_count as number | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
  };
}

// =============================================================================
// Exports
// =============================================================================

export const memberService = {
  // Members
  getMembers,
  getMemberById,
  getMemberWithDetails,
  createMember,
  updateMember,
  deleteMember,
  hardDeleteMember,
  searchMembers,
  findMemberByContact,

  // Transactions
  getMemberTransactions,
  createTransaction,
  getLtvBreakdown,

  // Visits
  getMemberVisits,
  createVisit,
  getVisitStats,

  // Consent
  getMemberConsent,
  upsertConsent,
  updateConsent,
  canSendSms,
  canSendEmail,

  // Tags
  addTags,
  removeTags,
  getAllTags,
};

export default memberService;
