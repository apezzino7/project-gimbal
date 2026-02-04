/**
 * Member Management Type Definitions
 * Types for sites, members, transactions, visits, consent, and automation
 */

// =============================================================================
// Site Types
// =============================================================================

export type SiteLevel = 'company' | 'region' | 'site';

export interface Site {
  id: string;
  userId: string;
  name: string;
  code: string;
  parentSiteId: string | null;
  siteLevel: SiteLevel;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  phone: string | null;
  email: string | null;
  defaultAcquisitionCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteInput {
  name: string;
  code: string;
  parentSiteId?: string | null;
  siteLevel?: SiteLevel;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  timezone?: string;
  phone?: string | null;
  email?: string | null;
  defaultAcquisitionCost?: number;
}

export interface UpdateSiteInput extends Partial<CreateSiteInput> {
  isActive?: boolean;
}

export interface SiteWithHierarchy extends Site {
  children?: SiteWithHierarchy[];
  depth?: number;
}

export interface SiteStats {
  totalMembers: number;
  activeMembers: number;
  totalRevenue: number;
  avgLtv: number;
}

// =============================================================================
// Membership Level Types
// =============================================================================

export interface MembershipLevelBenefits {
  discount?: number;
  priorityBooking?: boolean;
  freeClasses?: number;
  guestPasses?: number;
  [key: string]: unknown;
}

export interface MembershipLevel {
  id: string;
  siteId: string;
  name: string;
  code: string;
  displayOrder: number;
  benefits: MembershipLevelBenefits;
  minLifetimeValue: number | null;
  minVisitCount: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateMembershipLevelInput {
  siteId: string;
  name: string;
  code: string;
  displayOrder?: number;
  benefits?: MembershipLevelBenefits;
  minLifetimeValue?: number | null;
  minVisitCount?: number | null;
}

export interface UpdateMembershipLevelInput extends Partial<Omit<CreateMembershipLevelInput, 'siteId'>> {
  isActive?: boolean;
}

// =============================================================================
// Member Types
// =============================================================================

export type MembershipStatus = 'active' | 'expired' | 'cancelled' | 'suspended' | 'pending';

export type AcquisitionSource = 'campaign' | 'promo_code' | 'referral' | 'organic' | 'import' | 'api';

export interface Member {
  id: string;
  userId: string;
  siteId: string;
  membershipLevelId: string | null;
  externalId: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  membershipStartDate: string | null;
  membershipExpiryDate: string | null;
  membershipStatus: MembershipStatus;
  totalVisits: number;
  lastVisitAt: string | null;
  totalTransactions: number;
  lifetimeValue: number;
  averageTransaction: number;
  acquisitionSource: AcquisitionSource | null;
  acquisitionCampaignId: string | null;
  acquisitionPromoCode: string | null;
  acquisitionCost: number | null;
  acquisitionDate: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  sourceImportId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MemberWithDetails extends Member {
  site?: Site;
  membershipLevel?: MembershipLevel;
  consent?: MemberConsent;
}

export interface CreateMemberInput {
  siteId: string;
  membershipLevelId?: string | null;
  externalId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string;
  membershipStartDate?: string | null;
  membershipExpiryDate?: string | null;
  membershipStatus?: MembershipStatus;
  acquisitionSource?: AcquisitionSource | null;
  acquisitionCampaignId?: string | null;
  acquisitionPromoCode?: string | null;
  acquisitionCost?: number | null;
  acquisitionDate?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  sourceImportId?: string | null;
}

export interface UpdateMemberInput extends Partial<Omit<CreateMemberInput, 'siteId'>> {
  isActive?: boolean;
}

export interface MemberSearchParams {
  siteId?: string;
  searchTerm?: string;
  membershipStatus?: MembershipStatus;
  membershipLevelId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface MemberSearchResult {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  membershipStatus: MembershipStatus;
  membershipLevelName: string | null;
  lifetimeValue: number;
  totalVisits: number;
  lastVisitAt: string | null;
  siteName: string;
  createdAt: string;
}

// =============================================================================
// Transaction Types
// =============================================================================

export type TransactionType = 'purchase' | 'membership_fee' | 'refund' | 'credit' | 'adjustment';

export interface LineItem {
  name: string;
  qty: number;
  amount: number;
  sku?: string;
}

export interface MemberTransaction {
  id: string;
  memberId: string;
  siteId: string;
  externalTransactionId: string | null;
  transactionDate: string;
  amount: number;
  transactionType: TransactionType;
  promoCode: string | null;
  campaignId: string | null;
  description: string | null;
  lineItems: LineItem[];
  metadata: Record<string, unknown>;
  sourceImportId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  memberId: string;
  siteId: string;
  externalTransactionId?: string | null;
  transactionDate: string;
  amount: number;
  transactionType?: TransactionType;
  promoCode?: string | null;
  campaignId?: string | null;
  description?: string | null;
  lineItems?: LineItem[];
  metadata?: Record<string, unknown>;
  sourceImportId?: string | null;
}

export interface LtvBreakdown {
  transactionType: TransactionType;
  totalAmount: number;
  transactionCount: number;
  firstTransaction: string;
  lastTransaction: string;
}

// =============================================================================
// Visit Types
// =============================================================================

export type VisitType = 'regular' | 'class' | 'appointment' | 'event' | 'trial' | 'other';

export interface MemberVisit {
  id: string;
  memberId: string;
  siteId: string;
  visitDate: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  visitType: VisitType;
  serviceName: string | null;
  staffMember: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  sourceImportId: string | null;
  createdAt: string;
}

export interface CreateVisitInput {
  memberId: string;
  siteId: string;
  visitDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  visitType?: VisitType;
  serviceName?: string | null;
  staffMember?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown>;
  sourceImportId?: string | null;
}

export interface VisitStats {
  totalVisits: number;
  visitsThisMonth: number;
  visitsLastMonth: number;
  visitsThisYear: number;
  avgVisitsPerMonth: number;
  firstVisit: string | null;
  lastVisit: string | null;
  mostCommonVisitType: VisitType | null;
}

// =============================================================================
// Consent Types
// =============================================================================

export type ConsentSource = 'import' | 'web_form' | 'in_person' | 'api';
export type PreferredChannel = 'sms' | 'email' | 'both' | 'none';

export interface MemberConsent {
  id: string;
  memberId: string;
  smsConsent: boolean;
  smsConsentSource: ConsentSource | null;
  smsConsentedAt: string | null;
  smsConsentIp: string | null;
  smsOptOutAt: string | null;
  smsOptOutReason: string | null;
  emailConsent: boolean;
  emailConsentSource: ConsentSource | null;
  emailConsentedAt: string | null;
  emailUnsubscribedAt: string | null;
  emailUnsubscribeReason: string | null;
  doNotContact: boolean;
  preferredChannel: PreferredChannel;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConsentInput {
  memberId: string;
  smsConsent?: boolean;
  smsConsentSource?: ConsentSource | null;
  smsConsentIp?: string | null;
  emailConsent?: boolean;
  emailConsentSource?: ConsentSource | null;
  preferredChannel?: PreferredChannel;
}

export interface UpdateConsentInput extends Partial<Omit<CreateConsentInput, 'memberId'>> {
  doNotContact?: boolean;
}

export interface ConsentCheckResult {
  canSend: boolean;
  reason: string;
}

// =============================================================================
// Promo Code Types
// =============================================================================

export interface PromoCode {
  id: string;
  userId: string;
  siteId: string | null;
  code: string;
  description: string | null;
  campaignId: string | null;
  acquisitionCost: number | null;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  currentUses: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromoCodeInput {
  code: string;
  siteId?: string | null;
  description?: string | null;
  campaignId?: string | null;
  acquisitionCost?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
}

export interface UpdatePromoCodeInput extends Partial<Omit<CreatePromoCodeInput, 'code'>> {
  isActive?: boolean;
}

export interface PromoCodeValidationResult {
  isValid: boolean;
  promoCodeId: string | null;
  acquisitionCost: number | null;
  campaignId: string | null;
  message: string;
}

// =============================================================================
// Automation Types
// =============================================================================

export type TriggerType =
  // Time-based
  | 'birthday'
  | 'membership_anniversary'
  | 'days_since_visit'
  | 'days_since_transaction'
  | 'membership_expiring'
  | 'scheduled'
  // Event-based
  | 'new_member'
  | 'member_status_change'
  | 'visit_milestone'
  | 'ltv_milestone'
  | 'tag_added'
  | 'tag_removed';

export type ActionType = 'send_sms' | 'send_email' | 'add_tag' | 'remove_tag' | 'webhook' | 'update_field';

// Trigger configuration types
export interface BirthdayTriggerConfig {
  daysBefore: number;
}

export interface DaysSinceTriggerConfig {
  days: number;
}

export interface MembershipExpiringConfig {
  daysBefore: number;
}

export interface MilestoneTriggerConfig {
  counts?: number[];
  amounts?: number[];
}

export interface NewMemberConfig {
  delayHours: number;
}

export interface ScheduledTriggerConfig {
  date: string;
  time: string;
}

export interface TagTriggerConfig {
  tag: string;
}

export type TriggerConfig =
  | BirthdayTriggerConfig
  | DaysSinceTriggerConfig
  | MembershipExpiringConfig
  | MilestoneTriggerConfig
  | NewMemberConfig
  | ScheduledTriggerConfig
  | TagTriggerConfig
  | Record<string, unknown>;

// Action configuration types
export interface SendSmsActionConfig {
  templateId?: string;
  message?: string;
}

export interface SendEmailActionConfig {
  templateId?: string;
  subject?: string;
  body?: string;
}

export interface TagActionConfig {
  tag: string;
}

export interface WebhookActionConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface UpdateFieldActionConfig {
  field: string;
  value: unknown;
}

export type ActionConfig =
  | SendSmsActionConfig
  | SendEmailActionConfig
  | TagActionConfig
  | WebhookActionConfig
  | UpdateFieldActionConfig
  | Record<string, unknown>;

export interface AutomationTrigger {
  id: string;
  userId: string;
  siteId: string | null;
  name: string;
  description: string | null;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
  runTime: string;
  timezone: string;
  daysOfWeek: number[];
  membershipLevelIds: string[] | null;
  membershipStatuses: MembershipStatus[];
  requiredTags: string[] | null;
  excludedTags: string[] | null;
  minIntervalDays: number;
  maxSendsPerMember: number | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutomationTriggerInput {
  name: string;
  siteId?: string | null;
  description?: string | null;
  triggerType: TriggerType;
  triggerConfig: TriggerConfig;
  actionType: ActionType;
  actionConfig: ActionConfig;
  runTime?: string;
  timezone?: string;
  daysOfWeek?: number[];
  membershipLevelIds?: string[] | null;
  membershipStatuses?: MembershipStatus[];
  requiredTags?: string[] | null;
  excludedTags?: string[] | null;
  minIntervalDays?: number;
  maxSendsPerMember?: number | null;
}

export interface UpdateAutomationTriggerInput extends Partial<CreateAutomationTriggerInput> {
  isActive?: boolean;
}

export type AutomationExecutionStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'skipped';

export interface AutomationExecution {
  id: string;
  triggerId: string;
  memberId: string;
  executedAt: string;
  status: AutomationExecutionStatus;
  resultMessage: string | null;
  resultMetadata: Record<string, unknown>;
  actionType: ActionType;
}

// =============================================================================
// Import Types (extends dataImport.ts)
// =============================================================================

export interface MemberImportMapping {
  sourceColumn: string;
  targetField: keyof CreateMemberInput | 'skip';
  transformRules?: string[];
}

export interface MemberImportConfig {
  siteId: string;
  defaultMembershipLevelId?: string;
  defaultAcquisitionSource?: AcquisitionSource;
  defaultTags?: string[];
  duplicateHandling: 'skip' | 'update' | 'create_new';
  matchFields: ('email' | 'phone' | 'externalId')[];
}

export interface MemberImportResult {
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

// =============================================================================
// Analytics Types
// =============================================================================

export interface SiteTransactionSummary {
  totalRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  transactionCount: number;
  averageTransaction: number;
  uniqueMembers: number;
}

export interface CacSummary {
  totalMembers: number;
  totalAcquisitionCost: number;
  avgCac: number;
  bySource: Array<{
    source: AcquisitionSource;
    count: number;
    totalCost: number;
    avgCost: number;
  }>;
  byCampaign: Array<{
    campaignId: string;
    campaignName?: string;
    count: number;
    totalCost: number;
    avgCost: number;
  }>;
}

export interface LtvSummary {
  totalMembers: number;
  totalLtv: number;
  avgLtv: number;
  medianLtv: number;
  byMembershipLevel: Array<{
    levelId: string;
    levelName: string;
    count: number;
    totalLtv: number;
    avgLtv: number;
  }>;
  distribution: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
}

export interface MemberEngagementMetrics {
  totalMembers: number;
  activeMembers: number;
  atRiskMembers: number;
  lapsedMembers: number;
  avgVisitsPerMember: number;
  avgDaysSinceLastVisit: number;
  membersByStatus: Record<MembershipStatus, number>;
}
