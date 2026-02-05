/**
 * Admin Services
 * Exports for user management, settings, and audit functionality
 */

// Services
export { profileService } from './profileService';
export { appSettingsService } from './appSettingsService';

// Re-export types for convenience
export type {
  // Roles
  UserRole,
  // Profiles
  Profile,
  ProfileWithStats,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSearchParams,
  // Settings
  AppSettings,
  UpdateAppSettingsInput,
  SettingsSection,
  SettingsSectionConfig,
  // Audit
  AuditLog,
  AuditLogSearchParams,
} from '@/types/admin';

// Re-export constants
export {
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  SETTINGS_SECTIONS,
  AUDIT_EVENT_CATEGORIES,
  hasMinimumRole,
  canPerformAction,
} from '@/types/admin';
