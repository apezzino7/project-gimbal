/**
 * Data Import Framework Type Definitions
 *
 * This file contains all TypeScript interfaces for the data import feature including:
 * - Data source configurations
 * - Column configurations and cleaning rules
 * - Scheduling options
 * - Preview and sync responses
 */

// =============================================================================
// Data Source Types
// =============================================================================

export type DataSourceType =
  // Databases
  | 'postgres'
  | 'mysql'
  | 'mssql'
  | 'redshift'
  | 'bigquery'
  | 'snowflake'
  // Analytics
  | 'google_analytics'
  | 'meta_pixel'
  // Files
  | 'csv_upload'
  | 'csv_url'
  | 'google_sheets'
  | 'excel'
  // API
  | 'rest_api'
  | 'custom_database';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

export type SyncScheduleFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'cron';

export interface DataSource {
  id: string;
  user_id: string;
  name: string;
  type: DataSourceType;
  credentials: DataSourceCredentials;
  config: DataSourceConfig;
  column_config: ColumnConfiguration;
  schedule_config: ScheduleConfiguration;
  sync_schedule: SyncScheduleFrequency;
  last_sync_at: string | null;
  next_sync_at: string | null;
  last_sync_value: string | null;
  sync_status: SyncStatus;
  table_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Credentials
// =============================================================================

export type DataSourceCredentials =
  | DatabaseCredentials
  | OAuthCredentials
  | ApiKeyCredentials
  | FileCredentials;

export interface DatabaseCredentials {
  connection_string?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean;
  service_account_json?: string; // For BigQuery
  account_identifier?: string; // For Snowflake
}

export interface OAuthCredentials {
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  account_id?: string;
  property_id?: string; // For GA4
}

export interface ApiKeyCredentials {
  api_key: string;
  api_secret?: string;
  base_url?: string;
}

export interface FileCredentials {
  url?: string;
  auth_header?: string;
  sheet_id?: string; // For Google Sheets
}

// =============================================================================
// Data Source Configuration
// =============================================================================

export interface DataSourceConfig {
  // For database sources
  query_type?: 'table' | 'custom_query';
  table_name?: string;
  custom_query?: string;

  // For incremental sync
  incremental_column?: string;
  incremental_strategy?: 'full' | 'incremental';

  // For GA4/Meta
  property_id?: string;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  metrics?: string[];
  dimensions?: string[];

  // For CSV/Excel
  sheet_name?: string;
  header_row?: number;
  skip_rows?: number;

  // For REST API
  endpoint?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  response_path?: string; // JSONPath to data array
}

// =============================================================================
// Column Configuration
// =============================================================================

export interface ColumnConfiguration {
  columns: ColumnConfig[];
  row_filters: RowFilter[];
  duplicate_handling: DuplicateStrategy;
  duplicate_key_columns?: string[];
}

export interface ColumnConfig {
  source_name: string;
  target_name: string;
  type: ColumnType;
  included: boolean;
  cleaning_rules: CleaningRule[];
}

export type ColumnType = 'text' | 'number' | 'integer' | 'boolean' | 'date' | 'timestamp';

export type DetectedType = ColumnType | 'email' | 'phone' | 'url';

// =============================================================================
// Cleaning Rules
// =============================================================================

export type CleaningRule =
  // Whitespace
  | { type: 'trim' }
  | { type: 'collapse_whitespace' }

  // Case
  | { type: 'lowercase' }
  | { type: 'uppercase' }
  | { type: 'title_case' }

  // Null handling
  | { type: 'null_to_default'; default_value: string }
  | { type: 'empty_to_null' }
  | { type: 'skip_if_empty' }

  // Type coercion
  | { type: 'parse_number'; remove_chars?: string }
  | { type: 'parse_boolean'; true_values: string[]; false_values: string[] }
  | { type: 'parse_date'; format: string }
  | { type: 'parse_percentage'; as_decimal: boolean }

  // Validation
  | { type: 'validate_email'; on_invalid: ValidationAction }
  | { type: 'validate_phone'; format: 'e164' | 'national'; on_invalid: ValidationAction }
  | { type: 'validate_url'; on_invalid: ValidationAction }

  // Transformations
  | { type: 'find_replace'; find: string; replace: string; regex?: boolean }
  | { type: 'split'; delimiter: string; take_index: number }
  | { type: 'prefix'; value: string }
  | { type: 'suffix'; value: string };

export type ValidationAction = 'skip' | 'null' | 'keep';

// =============================================================================
// Row Filtering
// =============================================================================

export interface RowFilter {
  column: string;
  operator: FilterOperator;
  value?: string | number;
  action: 'include' | 'exclude';
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'greater_than'
  | 'less_than';

// =============================================================================
// Duplicate Handling
// =============================================================================

export type DuplicateStrategy = 'keep_all' | 'keep_first' | 'keep_last' | 'skip_all';

// =============================================================================
// Scheduling
// =============================================================================

export interface ScheduleConfiguration {
  frequency: SyncScheduleFrequency;
  time?: string; // "09:00" for daily/weekly/monthly
  timezone?: string; // "America/New_York"
  day_of_week?: number; // 0=Sunday, 1=Monday, etc.
  day_of_month?: number; // 1-28 (or 'last')
  cron_expression?: string; // For custom cron

  // Retry behavior
  retry_on_failure: boolean;
  max_retries: number;
  retry_delay_minutes: number;
}

// =============================================================================
// Preview Response
// =============================================================================

export interface PreviewResponse {
  columns: ColumnPreview[];
  rows: Record<string, unknown>[];
  total_rows: number;
}

export interface ColumnPreview {
  name: string;
  detected_type: DetectedType;
  sample_values: string[];
  null_count: number;
  unique_count: number;
}

// =============================================================================
// Sync Logs
// =============================================================================

export type SyncLogStatus = 'running' | 'success' | 'failed' | 'cancelled';

export interface SyncLog {
  id: string;
  data_source_id: string;
  started_at: string;
  completed_at: string | null;
  status: SyncLogStatus;
  records_imported: number;
  records_skipped: number;
  error_message: string | null;
  preview_data: PreviewResponse | null;
  metadata: Record<string, unknown>;
}

// =============================================================================
// Import Tables
// =============================================================================

export interface ImportTable {
  id: string;
  data_source_id: string;
  table_name: string;
  column_definitions: ColumnConfig[];
  row_count: number;
  created_at: string;
  last_updated_at: string;
}

// =============================================================================
// Cleaning Result
// =============================================================================

export interface CleaningResult {
  value: unknown;
  skip: boolean;
}

// =============================================================================
// Error Types
// =============================================================================

export type DataImportErrorCode =
  | 'CONNECTION_FAILED'
  | 'AUTH_EXPIRED'
  | 'RATE_LIMITED'
  | 'VALIDATION_FAILED'
  | 'PARTIAL_SUCCESS'
  | 'QUERY_ERROR'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'TABLE_NOT_FOUND'
  | 'COLUMN_NOT_FOUND';

export interface DataImportError {
  code: DataImportErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// =============================================================================
// API Request/Response Types
// =============================================================================

export interface CreateDataSourceRequest {
  name: string;
  type: DataSourceType;
  credentials: DataSourceCredentials;
  config: DataSourceConfig;
  column_config?: ColumnConfiguration;
  schedule_config?: ScheduleConfiguration;
  sync_schedule?: SyncScheduleFrequency;
}

export interface UpdateDataSourceRequest {
  name?: string;
  credentials?: DataSourceCredentials;
  config?: DataSourceConfig;
  column_config?: ColumnConfiguration;
  schedule_config?: ScheduleConfiguration;
  sync_schedule?: SyncScheduleFrequency;
  is_active?: boolean;
}

export interface TestConnectionRequest {
  type: DataSourceType;
  credentials: DataSourceCredentials;
  config?: DataSourceConfig;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  error?: DataImportError;
}

export interface PreviewDataRequest {
  type: DataSourceType;
  credentials: DataSourceCredentials;
  config: DataSourceConfig;
}

export interface TriggerSyncResponse {
  sync_log_id: string;
  status: 'started' | 'queued';
}

// =============================================================================
// Type Guards
// =============================================================================

export function isDatabaseType(type: DataSourceType): boolean {
  return ['postgres', 'mysql', 'mssql', 'redshift', 'bigquery', 'snowflake', 'custom_database'].includes(type);
}

export function isFileType(type: DataSourceType): boolean {
  return ['csv_upload', 'csv_url', 'google_sheets', 'excel'].includes(type);
}

export function isOAuthType(type: DataSourceType): boolean {
  return ['google_analytics', 'meta_pixel', 'google_sheets'].includes(type);
}

// =============================================================================
// Default Values
// =============================================================================

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfiguration = {
  frequency: 'manual',
  retry_on_failure: true,
  max_retries: 3,
  retry_delay_minutes: 15,
};

export const DEFAULT_COLUMN_CONFIG: ColumnConfiguration = {
  columns: [],
  row_filters: [],
  duplicate_handling: 'keep_all',
};
