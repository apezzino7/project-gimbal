/**
 * Member Import Data Source Service
 *
 * Manages data sources for recurring member imports.
 * Stores import configuration (mappings, cleaning rules, site assignment)
 * so scheduled syncs can run automatically.
 */

import { supabase } from '@/lib/supabase';
import type {
  DataSource,
  ScheduleConfiguration,
  ColumnConfiguration,
} from '@/types/dataImport';
import type { MemberImportMapping, MemberImportConfig } from '@/types/member';
import type { ExtendedColumnConfig } from '@/components/members/ImportWizard';

// =============================================================================
// Types
// =============================================================================

export interface MemberImportDataSourceConfig {
  /** Original filename */
  filename: string;
  /** Column mappings from source to member fields */
  mappings: MemberImportMapping[];
  /** Column configurations with cleaning rules */
  columnConfig: ExtendedColumnConfig[];
  /** Import configuration (site, tags, duplicate handling) */
  importConfig: MemberImportConfig;
}

export interface CreateMemberImportDataSourceInput {
  /** Display name for the data source */
  name: string;
  /** Configuration for the import */
  config: MemberImportDataSourceConfig;
  /** Schedule configuration */
  scheduleConfig: ScheduleConfiguration;
}

export interface MemberImportDataSource {
  id: string;
  userId: string;
  name: string;
  type: 'csv_upload';
  config: MemberImportDataSourceConfig;
  scheduleConfig: ScheduleConfiguration;
  syncSchedule: ScheduleConfiguration['frequency'];
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Service
// =============================================================================

/**
 * Create a new member import data source for scheduled syncs.
 */
export async function createMemberImportDataSource(
  input: CreateMemberImportDataSourceInput
): Promise<MemberImportDataSource> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  // Calculate next sync time based on schedule
  const nextSyncAt = calculateNextSyncTime(input.scheduleConfig);

  // Convert ExtendedColumnConfig to ColumnConfig for storage
  const columnConfigForStorage: ColumnConfiguration = {
    columns: input.config.columnConfig.map((col) => ({
      source_name: col.source_name,
      target_name: col.target_name,
      type: col.type,
      included: col.included,
      cleaning_rules: col.cleaning_rules,
    })),
    row_filters: [],
    duplicate_handling: input.config.importConfig.duplicateHandling === 'skip' ? 'skip_all' :
                        input.config.importConfig.duplicateHandling === 'update' ? 'keep_last' : 'keep_all',
    duplicate_key_columns: input.config.importConfig.matchFields,
  };

  const { data, error } = await supabase
    .from('data_sources')
    .insert({
      user_id: user.user.id,
      name: input.name,
      type: 'csv_upload',
      credentials: {}, // No credentials needed for CSV
      config: {
        query_type: 'member_import',
        filename: input.config.filename,
        mappings: input.config.mappings,
        import_config: input.config.importConfig,
      },
      column_config: columnConfigForStorage,
      schedule_config: input.scheduleConfig,
      sync_schedule: input.scheduleConfig.frequency,
      next_sync_at: nextSyncAt,
      sync_status: 'idle',
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create member import data source: ${error.message}`);
  }

  return mapToMemberImportDataSource(data);
}

/**
 * Get all member import data sources for the current user.
 */
export async function getMemberImportDataSources(): Promise<MemberImportDataSource[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('type', 'csv_upload')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch member import data sources: ${error.message}`);
  }

  return (data || [])
    .filter((d) => d.config?.query_type === 'member_import')
    .map(mapToMemberImportDataSource);
}

/**
 * Get a single member import data source by ID.
 */
export async function getMemberImportDataSource(id: string): Promise<MemberImportDataSource | null> {
  const { data, error } = await supabase
    .from('data_sources')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw new Error(`Failed to fetch member import data source: ${error.message}`);
  }

  return mapToMemberImportDataSource(data);
}

/**
 * Update a member import data source.
 */
export async function updateMemberImportDataSource(
  id: string,
  updates: Partial<CreateMemberImportDataSourceInput>
): Promise<MemberImportDataSource> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.config) {
    updateData.config = {
      query_type: 'member_import',
      filename: updates.config.filename,
      mappings: updates.config.mappings,
      import_config: updates.config.importConfig,
    };
  }

  if (updates.scheduleConfig) {
    updateData.schedule_config = updates.scheduleConfig;
    updateData.sync_schedule = updates.scheduleConfig.frequency;
    updateData.next_sync_at = calculateNextSyncTime(updates.scheduleConfig);
  }

  const { data, error } = await supabase
    .from('data_sources')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update member import data source: ${error.message}`);
  }

  return mapToMemberImportDataSource(data);
}

/**
 * Delete a member import data source.
 */
export async function deleteMemberImportDataSource(id: string): Promise<void> {
  const { error } = await supabase
    .from('data_sources')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to delete member import data source: ${error.message}`);
  }
}

/**
 * Toggle a member import data source active status.
 */
export async function toggleMemberImportDataSource(
  id: string,
  isActive: boolean
): Promise<MemberImportDataSource> {
  const { data, error } = await supabase
    .from('data_sources')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to toggle member import data source: ${error.message}`);
  }

  return mapToMemberImportDataSource(data);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate the next sync time based on schedule configuration.
 */
function calculateNextSyncTime(schedule: ScheduleConfiguration): string | null {
  if (schedule.frequency === 'manual') {
    return null;
  }

  const now = new Date();
  const time = schedule.time || '00:00';
  const [hours, minutes] = time.split(':').map(Number);

  // Create a date with the scheduled time
  const nextSync = new Date(now);
  nextSync.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, move to next occurrence
  if (nextSync <= now) {
    switch (schedule.frequency) {
      case 'hourly':
        nextSync.setHours(nextSync.getHours() + 1);
        break;
      case 'daily':
        nextSync.setDate(nextSync.getDate() + 1);
        break;
      case 'weekly':
        nextSync.setDate(nextSync.getDate() + 7);
        break;
      case 'monthly':
        nextSync.setMonth(nextSync.getMonth() + 1);
        break;
    }
  }

  // Handle weekly schedule - move to specified day
  if (schedule.frequency === 'weekly' && schedule.day_of_week !== undefined) {
    const currentDay = nextSync.getDay();
    const targetDay = schedule.day_of_week;
    const daysUntil = (targetDay - currentDay + 7) % 7;
    nextSync.setDate(nextSync.getDate() + daysUntil);
  }

  // Handle monthly schedule - move to specified day
  if (schedule.frequency === 'monthly' && schedule.day_of_month !== undefined) {
    nextSync.setDate(schedule.day_of_month);
    if (nextSync <= now) {
      nextSync.setMonth(nextSync.getMonth() + 1);
    }
  }

  return nextSync.toISOString();
}

/**
 * Map database record to MemberImportDataSource type.
 */
function mapToMemberImportDataSource(data: DataSource): MemberImportDataSource {
  const config = data.config as {
    query_type: string;
    filename: string;
    mappings: MemberImportMapping[];
    import_config: MemberImportConfig;
  };

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    type: 'csv_upload',
    config: {
      filename: config.filename || '',
      mappings: config.mappings || [],
      columnConfig: (data.column_config?.columns || []).map((col) => ({
        ...col,
        detectedType: col.type, // Restore detectedType from type
      })) as ExtendedColumnConfig[],
      importConfig: config.import_config || {
        siteId: '',
        duplicateHandling: 'skip',
        matchFields: ['email'],
      },
    },
    scheduleConfig: data.schedule_config,
    syncSchedule: data.sync_schedule,
    lastSyncAt: data.last_sync_at,
    nextSyncAt: data.next_sync_at,
    syncStatus: data.sync_status,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
