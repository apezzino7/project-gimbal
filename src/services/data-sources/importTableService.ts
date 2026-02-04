/**
 * Import Table Service
 *
 * Manages dynamically created tables for data imports.
 * Each data source creates its own dedicated PostgreSQL table.
 */

import { supabase } from '../../lib/supabase';
import type { ColumnConfig, ImportTable } from '../../types/dataImport';

// =============================================================================
// Table Creation
// =============================================================================

/**
 * Create a dynamic table for a data source
 * Uses a database function to create the table with proper RLS policies
 */
export async function createImportTable(
  userId: string,
  sourceName: string,
  columns: ColumnConfig[]
): Promise<string> {
  const { data, error } = await supabase.rpc('create_import_table', {
    p_user_id: userId,
    p_source_name: sourceName,
    p_columns: columns,
  });

  if (error) {
    throw new Error(`Failed to create import table: ${error.message}`);
  }

  return data as string;
}

/**
 * Generate a safe table name from source name
 */
export function generateTableName(sourceName: string): string {
  const sanitized = sourceName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  const shortUuid = crypto.randomUUID().substring(0, 8);
  return `import_${sanitized}_${shortUuid}`;
}

// =============================================================================
// Table Registry
// =============================================================================

/**
 * Register an import table in the registry
 */
export async function registerImportTable(
  dataSourceId: string,
  tableName: string,
  columnDefinitions: ColumnConfig[]
): Promise<ImportTable> {
  const { data, error } = await supabase
    .from('import_tables')
    .insert({
      data_source_id: dataSourceId,
      table_name: tableName,
      column_definitions: columnDefinitions,
      row_count: 0,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to register import table: ${error.message}`);
  }

  return data;
}

/**
 * Get import table info by data source ID
 */
export async function getImportTable(dataSourceId: string): Promise<ImportTable | null> {
  const { data, error } = await supabase
    .from('import_tables')
    .select('*')
    .eq('data_source_id', dataSourceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get import table: ${error.message}`);
  }

  return data;
}

/**
 * Update import table row count
 */
export async function updateRowCount(tableName: string, rowCount: number): Promise<void> {
  const { error } = await supabase
    .from('import_tables')
    .update({
      row_count: rowCount,
      last_updated_at: new Date().toISOString(),
    })
    .eq('table_name', tableName);

  if (error) {
    throw new Error(`Failed to update row count: ${error.message}`);
  }
}

// =============================================================================
// Table Operations
// =============================================================================

/**
 * Drop an import table (called when data source is deleted)
 */
export async function dropImportTable(tableName: string): Promise<void> {
  // First remove from registry
  const { error: registryError } = await supabase
    .from('import_tables')
    .delete()
    .eq('table_name', tableName);

  if (registryError) {
    console.warn(`Failed to remove table from registry: ${registryError.message}`);
  }

  // Then drop the actual table via RPC
  const { error } = await supabase.rpc('drop_import_table', {
    p_table_name: tableName,
  });

  if (error) {
    throw new Error(`Failed to drop import table: ${error.message}`);
  }
}

/**
 * Truncate (clear) an import table
 */
export async function truncateImportTable(tableName: string): Promise<void> {
  const { error } = await supabase.rpc('truncate_import_table', {
    p_table_name: tableName,
  });

  if (error) {
    throw new Error(`Failed to truncate import table: ${error.message}`);
  }

  // Update row count to 0
  await updateRowCount(tableName, 0);
}

// =============================================================================
// Data Operations
// =============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
}

/**
 * Query data from an import table
 */
export async function queryImportTable(
  tableName: string,
  options: QueryOptions = {}
): Promise<{ data: Record<string, unknown>[]; count: number }> {
  const { limit = 100, offset = 0, orderBy, orderDirection = 'desc', filters } = options;

  // Build query through RPC to handle dynamic table name
  const { data, error } = await supabase.rpc('query_import_table', {
    p_table_name: tableName,
    p_limit: limit,
    p_offset: offset,
    p_order_by: orderBy,
    p_order_direction: orderDirection,
    p_filters: filters ?? {},
  });

  if (error) {
    throw new Error(`Failed to query import table: ${error.message}`);
  }

  return {
    data: data?.rows ?? [],
    count: data?.total_count ?? 0,
  };
}

/**
 * Insert rows into an import table
 */
export async function insertRows(
  tableName: string,
  rows: Record<string, unknown>[]
): Promise<number> {
  if (rows.length === 0) return 0;

  const { data, error } = await supabase.rpc('insert_import_rows', {
    p_table_name: tableName,
    p_rows: rows,
  });

  if (error) {
    throw new Error(`Failed to insert rows: ${error.message}`);
  }

  return data as number;
}

/**
 * Insert rows in batches for large imports
 */
export async function insertRowsBatched(
  tableName: string,
  rows: Record<string, unknown>[],
  batchSize = 1000,
  onProgress?: (inserted: number, total: number) => void
): Promise<number> {
  let totalInserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const inserted = await insertRows(tableName, batch);
    totalInserted += inserted;

    if (onProgress) {
      onProgress(totalInserted, rows.length);
    }
  }

  // Update row count after all batches
  await updateRowCount(tableName, totalInserted);

  return totalInserted;
}

// =============================================================================
// Schema Operations
// =============================================================================

/**
 * Get the columns of an import table
 */
export async function getTableColumns(tableName: string): Promise<
  Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>
> {
  const { data, error } = await supabase.rpc('get_import_table_columns', {
    p_table_name: tableName,
  });

  if (error) {
    throw new Error(`Failed to get table columns: ${error.message}`);
  }

  return data ?? [];
}

/**
 * Add a column to an existing import table
 */
export async function addColumn(
  tableName: string,
  columnName: string,
  columnType: string
): Promise<void> {
  const { error } = await supabase.rpc('add_import_table_column', {
    p_table_name: tableName,
    p_column_name: columnName,
    p_column_type: columnType,
  });

  if (error) {
    throw new Error(`Failed to add column: ${error.message}`);
  }
}

// =============================================================================
// Export Service
// =============================================================================

export const importTableService = {
  createImportTable,
  generateTableName,
  registerImportTable,
  getImportTable,
  updateRowCount,
  dropImportTable,
  truncateImportTable,
  queryImportTable,
  insertRows,
  insertRowsBatched,
  getTableColumns,
  addColumn,
};

export default importTableService;
