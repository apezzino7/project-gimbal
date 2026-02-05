/**
 * Query Keys - Centralized React Query key management
 *
 * Provides type-safe, consistent query keys for all data fetching.
 * Organized by domain (auth, sites, members, campaigns, etc.)
 */

// =============================================================================
// Auth Keys
// =============================================================================

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
  user: () => [...authKeys.all, 'user'] as const,
};

// =============================================================================
// Site Keys
// =============================================================================

export const siteKeys = {
  all: ['sites'] as const,
  lists: () => [...siteKeys.all, 'list'] as const,
  list: (filters?: { isActive?: boolean }) =>
    [...siteKeys.lists(), filters] as const,
  details: () => [...siteKeys.all, 'detail'] as const,
  detail: (id: string) => [...siteKeys.details(), id] as const,
  hierarchy: (id: string) => [...siteKeys.all, 'hierarchy', id] as const,
  stats: (id: string) => [...siteKeys.all, 'stats', id] as const,
};

// =============================================================================
// Member Keys
// =============================================================================

export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters?: {
    siteId?: string;
    status?: string;
    levelId?: string;
    search?: string;
  }) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
  transactions: (memberId: string) =>
    [...memberKeys.all, 'transactions', memberId] as const,
  visits: (memberId: string) =>
    [...memberKeys.all, 'visits', memberId] as const,
  consent: (memberId: string) =>
    [...memberKeys.all, 'consent', memberId] as const,
  ltv: (memberId: string) =>
    [...memberKeys.all, 'ltv', memberId] as const,
  search: (query: string, siteId?: string) =>
    [...memberKeys.all, 'search', { query, siteId }] as const,
};

// =============================================================================
// Membership Level Keys
// =============================================================================

export const membershipLevelKeys = {
  all: ['membershipLevels'] as const,
  lists: () => [...membershipLevelKeys.all, 'list'] as const,
  list: (siteId?: string) =>
    [...membershipLevelKeys.lists(), siteId] as const,
  details: () => [...membershipLevelKeys.all, 'detail'] as const,
  detail: (id: string) => [...membershipLevelKeys.details(), id] as const,
};

// =============================================================================
// Analytics / Dashboard Keys
// =============================================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: () => [...analyticsKeys.all, 'dashboard'] as const,
  dashboardMetrics: (siteId?: string, dateRange?: { start: string; end: string }) =>
    [...analyticsKeys.dashboard(), 'metrics', { siteId, dateRange }] as const,
  memberMetrics: (siteId?: string) =>
    [...analyticsKeys.all, 'members', siteId] as const,
  transactionMetrics: (siteId?: string, dateRange?: { start: string; end: string }) =>
    [...analyticsKeys.all, 'transactions', { siteId, dateRange }] as const,
  visitMetrics: (siteId?: string, dateRange?: { start: string; end: string }) =>
    [...analyticsKeys.all, 'visits', { siteId, dateRange }] as const,
  ltvDistribution: (siteId?: string) =>
    [...analyticsKeys.all, 'ltv-distribution', siteId] as const,
  engagementTrends: (siteId?: string, dateRange?: { start: string; end: string }) =>
    [...analyticsKeys.all, 'engagement-trends', { siteId, dateRange }] as const,
};

// =============================================================================
// Campaign Keys (for future use)
// =============================================================================

export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (filters?: { status?: string; type?: string }) =>
    [...campaignKeys.lists(), filters] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
  metrics: (id: string) => [...campaignKeys.all, 'metrics', id] as const,
  messages: (id: string) => [...campaignKeys.all, 'messages', id] as const,
};

// =============================================================================
// Template Keys (for future use)
// =============================================================================

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (type?: 'sms' | 'email') =>
    [...templateKeys.lists(), type] as const,
  details: () => [...templateKeys.all, 'detail'] as const,
  detail: (id: string) => [...templateKeys.details(), id] as const,
};

// =============================================================================
// Promo Code Keys
// =============================================================================

export const promoCodeKeys = {
  all: ['promoCodes'] as const,
  lists: () => [...promoCodeKeys.all, 'list'] as const,
  list: (siteId?: string) =>
    [...promoCodeKeys.lists(), siteId] as const,
  details: () => [...promoCodeKeys.all, 'detail'] as const,
  detail: (id: string) => [...promoCodeKeys.details(), id] as const,
  validate: (code: string, siteId?: string) =>
    [...promoCodeKeys.all, 'validate', { code, siteId }] as const,
};

// =============================================================================
// Automation Keys
// =============================================================================

export const automationKeys = {
  all: ['automations'] as const,
  lists: () => [...automationKeys.all, 'list'] as const,
  list: (siteId?: string) =>
    [...automationKeys.lists(), siteId] as const,
  details: () => [...automationKeys.all, 'detail'] as const,
  detail: (id: string) => [...automationKeys.details(), id] as const,
  executions: (triggerId: string) =>
    [...automationKeys.all, 'executions', triggerId] as const,
};

// =============================================================================
// Audit Log Keys
// =============================================================================

export const auditKeys = {
  all: ['audit'] as const,
  logs: (filters?: { eventType?: string; email?: string; dateRange?: { start: string; end: string } }) =>
    [...auditKeys.all, 'logs', filters] as const,
  stats: (days?: number) => [...auditKeys.all, 'stats', days] as const,
  eventTypes: () => [...auditKeys.all, 'eventTypes'] as const,
};

// =============================================================================
// Profile / Admin Keys
// =============================================================================

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  list: (filters?: { role?: string; isActive?: boolean; search?: string }) =>
    [...profileKeys.lists(), filters] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  currentRole: () => [...profileKeys.all, 'currentRole'] as const,
  stats: () => [...profileKeys.all, 'stats'] as const,
};

export const appSettingsKeys = {
  all: ['appSettings'] as const,
  current: () => [...appSettingsKeys.all, 'current'] as const,
  masked: () => [...appSettingsKeys.all, 'masked'] as const,
  messagingStatus: () => [...appSettingsKeys.all, 'messagingStatus'] as const,
};
