/**
 * Admin Types
 * Types for user management, RBAC, and application settings
 */

// =============================================================================
// User Roles & Permissions
// =============================================================================

export type UserRole = 'admin' | 'user' | 'viewer';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 3,
  user: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  user: 'User',
  viewer: 'Viewer',
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Full access to all features, user management, and settings',
  user: 'Create and manage campaigns, view analytics',
  viewer: 'Read-only access to reports and analytics',
};

// =============================================================================
// Profile Types
// =============================================================================

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileWithStats extends Profile {
  campaignCount?: number;
  lastActivityAt?: string | null;
}

export interface CreateProfileInput {
  email: string;
  role?: UserRole;
  displayName?: string;
  phone?: string;
}

export interface UpdateProfileInput {
  displayName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  role?: UserRole;
  isActive?: boolean;
}

export interface ProfileSearchParams {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  sortBy?: 'email' | 'displayName' | 'role' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// =============================================================================
// App Settings Types
// =============================================================================

export interface AppSettings {
  id: string;
  // Twilio Settings
  twilioAccountSid: string | null;
  twilioAuthToken: string | null;
  twilioPhoneNumber: string | null;
  // SendGrid Settings
  sendgridApiKey: string | null;
  sendgridFromEmail: string | null;
  sendgridFromName: string | null;
  // General Settings
  companyName: string;
  companyAddress: string | null;
  timezone: string;
  // Rate Limits
  monthlySmsLimit: number;
  monthlyEmailLimit: number;
  // Data Retention
  dataRetentionDays: number;
  auditRetentionDays: number;
  // Metadata
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAppSettingsInput {
  // Twilio Settings
  twilioAccountSid?: string | null;
  twilioAuthToken?: string | null;
  twilioPhoneNumber?: string | null;
  // SendGrid Settings
  sendgridApiKey?: string | null;
  sendgridFromEmail?: string | null;
  sendgridFromName?: string | null;
  // General Settings
  companyName?: string;
  companyAddress?: string | null;
  timezone?: string;
  // Rate Limits
  monthlySmsLimit?: number;
  monthlyEmailLimit?: number;
  // Data Retention
  dataRetentionDays?: number;
  auditRetentionDays?: number;
}

// Settings sections for UI organization
export type SettingsSection = 'general' | 'twilio' | 'sendgrid' | 'limits' | 'retention';

export interface SettingsSectionConfig {
  id: SettingsSection;
  label: string;
  description: string;
  icon?: string;
}

export const SETTINGS_SECTIONS: SettingsSectionConfig[] = [
  {
    id: 'general',
    label: 'General',
    description: 'Company information and timezone settings',
  },
  {
    id: 'twilio',
    label: 'Twilio (SMS)',
    description: 'Configure SMS messaging via Twilio',
  },
  {
    id: 'sendgrid',
    label: 'SendGrid (Email)',
    description: 'Configure email delivery via SendGrid',
  },
  {
    id: 'limits',
    label: 'Rate Limits',
    description: 'Monthly message sending limits',
  },
  {
    id: 'retention',
    label: 'Data Retention',
    description: 'Data and audit log retention policies',
  },
];

// =============================================================================
// Audit Log Types
// =============================================================================

export interface AuditLog {
  id: string;
  eventType: string;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogSearchParams {
  search?: string;
  eventType?: string;
  email?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export const AUDIT_EVENT_CATEGORIES: Record<string, string[]> = {
  Authentication: [
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT',
    'SESSION_EXPIRED',
    'ACCOUNT_LOCKED',
  ],
  'User Management': [
    'USER_CREATED',
    'USER_DELETED',
    'ROLE_CHANGED',
    'USER_ACTIVATED',
    'USER_DEACTIVATED',
  ],
  Campaigns: [
    'CAMPAIGN_CREATED',
    'CAMPAIGN_UPDATED',
    'CAMPAIGN_SCHEDULED',
    'CAMPAIGN_SENT',
    'CAMPAIGN_CANCELLED',
  ],
  Messaging: [
    'SMS_SENT',
    'SMS_DELIVERED',
    'SMS_FAILED',
    'EMAIL_SENT',
    'EMAIL_DELIVERED',
    'EMAIL_FAILED',
  ],
  Settings: [
    'SETTINGS_UPDATED',
  ],
};

// =============================================================================
// Permission Helpers
// =============================================================================

/**
 * Check if a role meets the minimum required role level
 */
export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can perform an action based on role
 */
export function canPerformAction(
  userRole: UserRole,
  action: 'manage_users' | 'manage_settings' | 'create_campaigns' | 'view_analytics'
): boolean {
  switch (action) {
    case 'manage_users':
    case 'manage_settings':
      return userRole === 'admin';
    case 'create_campaigns':
      return hasMinimumRole(userRole, 'user');
    case 'view_analytics':
      return hasMinimumRole(userRole, 'viewer');
    default:
      return false;
  }
}

// =============================================================================
// Database Row Types (for mapping from Supabase)
// =============================================================================

export interface ProfileRow {
  id: string;
  email: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: string;
  twilio_account_sid: string | null;
  twilio_auth_token: string | null;
  twilio_phone_number: string | null;
  sendgrid_api_key: string | null;
  sendgrid_from_email: string | null;
  sendgrid_from_name: string | null;
  company_name: string;
  company_address: string | null;
  timezone: string;
  monthly_sms_limit: number;
  monthly_email_limit: number;
  data_retention_days: number;
  audit_retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  event_type: string;
  email: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// =============================================================================
// Row Mappers
// =============================================================================

export function mapProfileRow(row: ProfileRow): Profile {
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

export function mapAppSettingsRow(row: AppSettingsRow): AppSettings {
  return {
    id: row.id,
    twilioAccountSid: row.twilio_account_sid,
    twilioAuthToken: row.twilio_auth_token,
    twilioPhoneNumber: row.twilio_phone_number,
    sendgridApiKey: row.sendgrid_api_key,
    sendgridFromEmail: row.sendgrid_from_email,
    sendgridFromName: row.sendgrid_from_name,
    companyName: row.company_name,
    companyAddress: row.company_address,
    timezone: row.timezone,
    monthlySmsLimit: row.monthly_sms_limit,
    monthlyEmailLimit: row.monthly_email_limit,
    dataRetentionDays: row.data_retention_days,
    auditRetentionDays: row.audit_retention_days,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAuditLogRow(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    eventType: row.event_type,
    email: row.email,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
