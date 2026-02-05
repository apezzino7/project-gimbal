/**
 * App Settings Service
 * CRUD operations for application settings (singleton table)
 */

import { supabase } from '@/lib/supabase';
import type {
  AppSettings,
  UpdateAppSettingsInput,
  AppSettingsRow,
  AuditLog,
  AuditLogRow,
  AuditLogSearchParams,
} from '@/types/admin';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function AppSettingsServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'AppSettingsServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Row Mappers
// =============================================================================

function toAppSettings(row: AppSettingsRow): AppSettings {
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

function toAuditLog(row: AuditLogRow): AuditLog {
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

// =============================================================================
// App Settings Operations
// =============================================================================

/**
 * Get the current app settings
 * Since this is a singleton table, we just get the first row
 */
export async function getAppSettings(): Promise<AppSettings | null> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw AppSettingsServiceError('Failed to fetch app settings', error);
  }

  return data ? toAppSettings(data) : null;
}

/**
 * Update app settings
 */
export async function updateAppSettings(
  input: UpdateAppSettingsInput
): Promise<AppSettings> {
  // Get current settings to find the ID
  const current = await getAppSettings();
  if (!current) {
    throw AppSettingsServiceError('App settings not found');
  }

  const updateData: Record<string, unknown> = {};

  // Twilio settings
  if (input.twilioAccountSid !== undefined) {
    updateData.twilio_account_sid = input.twilioAccountSid;
  }
  if (input.twilioAuthToken !== undefined) {
    updateData.twilio_auth_token = input.twilioAuthToken;
  }
  if (input.twilioPhoneNumber !== undefined) {
    updateData.twilio_phone_number = input.twilioPhoneNumber;
  }

  // SendGrid settings
  if (input.sendgridApiKey !== undefined) {
    updateData.sendgrid_api_key = input.sendgridApiKey;
  }
  if (input.sendgridFromEmail !== undefined) {
    updateData.sendgrid_from_email = input.sendgridFromEmail;
  }
  if (input.sendgridFromName !== undefined) {
    updateData.sendgrid_from_name = input.sendgridFromName;
  }

  // General settings
  if (input.companyName !== undefined) {
    updateData.company_name = input.companyName;
  }
  if (input.companyAddress !== undefined) {
    updateData.company_address = input.companyAddress;
  }
  if (input.timezone !== undefined) {
    updateData.timezone = input.timezone;
  }

  // Rate limits
  if (input.monthlySmsLimit !== undefined) {
    updateData.monthly_sms_limit = input.monthlySmsLimit;
  }
  if (input.monthlyEmailLimit !== undefined) {
    updateData.monthly_email_limit = input.monthlyEmailLimit;
  }

  // Data retention
  if (input.dataRetentionDays !== undefined) {
    updateData.data_retention_days = input.dataRetentionDays;
  }
  if (input.auditRetentionDays !== undefined) {
    updateData.audit_retention_days = input.auditRetentionDays;
  }

  const { data, error } = await supabase
    .from('app_settings')
    .update(updateData)
    .eq('id', current.id)
    .select()
    .single();

  if (error) {
    throw AppSettingsServiceError('Failed to update app settings', error);
  }

  return toAppSettings(data);
}

/**
 * Get settings with masked secrets
 * Use this for displaying settings in the UI
 */
export async function getAppSettingsMasked(): Promise<AppSettings | null> {
  const settings = await getAppSettings();
  if (!settings) return null;

  return {
    ...settings,
    twilioAuthToken: settings.twilioAuthToken ? '••••••••' : null,
    sendgridApiKey: settings.sendgridApiKey ? '••••••••' : null,
  };
}

/**
 * Check if Twilio is configured
 */
export async function isTwilioConfigured(): Promise<boolean> {
  const settings = await getAppSettings();
  return !!(
    settings?.twilioAccountSid &&
    settings?.twilioAuthToken &&
    settings?.twilioPhoneNumber
  );
}

/**
 * Check if SendGrid is configured
 */
export async function isSendGridConfigured(): Promise<boolean> {
  const settings = await getAppSettings();
  return !!(settings?.sendgridApiKey && settings?.sendgridFromEmail);
}

/**
 * Get messaging configuration status
 */
export async function getMessagingStatus(): Promise<{
  sms: { configured: boolean; phoneNumber: string | null };
  email: { configured: boolean; fromEmail: string | null; fromName: string | null };
}> {
  const settings = await getAppSettings();

  return {
    sms: {
      configured: !!(
        settings?.twilioAccountSid &&
        settings?.twilioAuthToken &&
        settings?.twilioPhoneNumber
      ),
      phoneNumber: settings?.twilioPhoneNumber ?? null,
    },
    email: {
      configured: !!(settings?.sendgridApiKey && settings?.sendgridFromEmail),
      fromEmail: settings?.sendgridFromEmail ?? null,
      fromName: settings?.sendgridFromName ?? null,
    },
  };
}

// =============================================================================
// Audit Log Operations
// =============================================================================

/**
 * Get audit logs with optional filters
 */
export async function getAuditLogs(
  params?: AuditLogSearchParams
): Promise<AuditLog[]> {
  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (params?.search) {
    query = query.or(
      `email.ilike.%${params.search}%,event_type.ilike.%${params.search}%`
    );
  }

  if (params?.eventType) {
    query = query.eq('event_type', params.eventType);
  }

  if (params?.email) {
    query = query.eq('email', params.email);
  }

  if (params?.startDate) {
    query = query.gte('created_at', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('created_at', params.endDate);
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
    throw AppSettingsServiceError('Failed to fetch audit logs', error);
  }

  return (data || []).map(toAuditLog);
}

/**
 * Get audit log count
 */
export async function getAuditLogCount(params?: {
  eventType?: string;
  email?: string;
  startDate?: string;
  endDate?: string;
}): Promise<number> {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true });

  if (params?.eventType) {
    query = query.eq('event_type', params.eventType);
  }

  if (params?.email) {
    query = query.eq('email', params.email);
  }

  if (params?.startDate) {
    query = query.gte('created_at', params.startDate);
  }

  if (params?.endDate) {
    query = query.lte('created_at', params.endDate);
  }

  const { count, error } = await query;

  if (error) {
    throw AppSettingsServiceError('Failed to count audit logs', error);
  }

  return count ?? 0;
}

/**
 * Get unique event types from audit logs
 */
export async function getAuditEventTypes(): Promise<string[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('event_type')
    .order('event_type');

  if (error) {
    throw AppSettingsServiceError('Failed to fetch event types', error);
  }

  const types = new Set<string>();
  for (const row of data || []) {
    if (row.event_type) {
      types.add(row.event_type);
    }
  }

  return Array.from(types);
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(days: number = 7): Promise<{
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByDay: Array<{ date: string; count: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('audit_logs')
    .select('event_type, created_at')
    .gte('created_at', startDate.toISOString());

  if (error) {
    throw AppSettingsServiceError('Failed to fetch audit stats', error);
  }

  const eventsByType: Record<string, number> = {};
  const eventsByDay: Record<string, number> = {};

  for (const row of data || []) {
    // Count by type
    const type = row.event_type;
    eventsByType[type] = (eventsByType[type] || 0) + 1;

    // Count by day
    const day = row.created_at.split('T')[0];
    eventsByDay[day] = (eventsByDay[day] || 0) + 1;
  }

  // Convert eventsByDay to array sorted by date
  const eventsByDayArray = Object.entries(eventsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalEvents: data?.length ?? 0,
    eventsByType,
    eventsByDay: eventsByDayArray,
  };
}

// =============================================================================
// Exports
// =============================================================================

export const appSettingsService = {
  // Settings
  getAppSettings,
  getAppSettingsMasked,
  updateAppSettings,
  isTwilioConfigured,
  isSendGridConfigured,
  getMessagingStatus,

  // Audit Logs
  getAuditLogs,
  getAuditLogCount,
  getAuditEventTypes,
  getAuditLogStats,
};

export default appSettingsService;
