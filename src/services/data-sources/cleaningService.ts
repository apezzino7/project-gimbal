/**
 * Data Cleaning Service
 *
 * Provides functions for cleaning and transforming imported data
 * based on user-configured cleaning rules.
 */

import type {
  CleaningRule,
  CleaningResult,
  ColumnConfig,
  ColumnConfiguration,
  ColumnPreview,
  DetectedType,
  RowFilter,
} from '../../types/dataImport';

// =============================================================================
// Type Detection
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[\d\s+()-]+$/;
const URL_REGEX = /^https?:\/\//i;
const INTEGER_REGEX = /^-?\d+$/;
const BOOLEAN_VALUES = ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'];

/**
 * Detect the type of a value based on its content
 */
export function detectValueType(value: unknown): DetectedType {
  if (value === null || value === undefined || value === '') {
    return 'text';
  }

  const str = String(value).trim();

  // Check email
  if (EMAIL_REGEX.test(str)) {
    return 'email';
  }

  // Check URL
  if (URL_REGEX.test(str)) {
    return 'url';
  }

  // Check phone (has 10+ digits)
  if (PHONE_REGEX.test(str) && str.replace(/\D/g, '').length >= 10) {
    return 'phone';
  }

  // Check boolean
  if (BOOLEAN_VALUES.includes(str.toLowerCase())) {
    return 'boolean';
  }

  // Check integer
  const cleanedNumber = str.replace(/,/g, '');
  if (INTEGER_REGEX.test(cleanedNumber)) {
    return 'integer';
  }

  // Check number (with currency symbols)
  const numberCleaned = str.replace(/[$€£,]/g, '');
  if (!isNaN(parseFloat(numberCleaned)) && isFinite(Number(numberCleaned))) {
    return 'number';
  }

  // Check date
  if (!isNaN(Date.parse(str)) && str.length > 5) {
    return 'date';
  }

  return 'text';
}

/**
 * Analyze a column's values and detect the most likely type
 */
export function detectColumnType(values: unknown[]): {
  type: DetectedType;
  confidence: number;
} {
  const nonNull = values.filter(v => v != null && v !== '');

  if (nonNull.length === 0) {
    return { type: 'text', confidence: 0 };
  }

  const typeCounts: Record<DetectedType, number> = {
    text: 0,
    number: 0,
    integer: 0,
    boolean: 0,
    date: 0,
    timestamp: 0,
    email: 0,
    phone: 0,
    url: 0,
  };

  for (const value of nonNull) {
    const detectedType = detectValueType(value);
    typeCounts[detectedType]++;
  }

  // Find the most common type
  let maxType: DetectedType = 'text';
  let maxCount = 0;

  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxType = type as DetectedType;
    }
  }

  const confidence = maxCount / nonNull.length;

  return { type: maxType, confidence };
}

/**
 * Analyze columns from sample rows and generate previews
 */
export function analyzeColumns(rows: Record<string, unknown>[]): ColumnPreview[] {
  if (rows.length === 0) return [];

  const columns = Object.keys(rows[0]);
  const previews: ColumnPreview[] = [];

  for (const columnName of columns) {
    const values = rows.map(row => row[columnName]);
    const { type } = detectColumnType(values);

    const sampleValues = values
      .filter(v => v != null && v !== '')
      .slice(0, 5)
      .map(v => String(v));

    const nullCount = values.filter(v => v == null || v === '').length;
    const uniqueValues = new Set(values.filter(v => v != null && v !== ''));

    previews.push({
      name: columnName,
      detected_type: type,
      sample_values: sampleValues,
      null_count: nullCount,
      unique_count: uniqueValues.size,
    });
  }

  return previews;
}

// =============================================================================
// Cleaning Rule Application
// =============================================================================

/**
 * Apply a single cleaning rule to a value
 */
export function applyRule(value: unknown, rule: CleaningRule): CleaningResult {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    if (rule.type === 'null_to_default') {
      return { value: rule.default_value, skip: false };
    }
    if (rule.type === 'skip_if_empty') {
      return { value: null, skip: true };
    }
    return { value: null, skip: false };
  }

  const str = String(value);

  switch (rule.type) {
    // Whitespace
    case 'trim':
      return { value: str.trim(), skip: false };

    case 'collapse_whitespace':
      return { value: str.replace(/\s+/g, ' ').trim(), skip: false };

    // Case
    case 'lowercase':
      return { value: str.toLowerCase(), skip: false };

    case 'uppercase':
      return { value: str.toUpperCase(), skip: false };

    case 'title_case':
      return {
        value: str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
        skip: false,
      };

    // Null handling
    case 'null_to_default':
      return { value: str || rule.default_value, skip: false };

    case 'empty_to_null':
      return { value: str.trim() === '' ? null : str, skip: false };

    case 'skip_if_empty':
      return { value: str, skip: str.trim() === '' };

    // Type coercion
    case 'parse_number': {
      let cleaned = str;
      if (rule.remove_chars) {
        const charsToRemove = new RegExp(`[${rule.remove_chars}]`, 'g');
        cleaned = cleaned.replace(charsToRemove, '');
      }
      // Also remove common currency symbols and commas
      cleaned = cleaned.replace(/[$€£,]/g, '');
      const num = parseFloat(cleaned);
      return { value: isNaN(num) ? null : num, skip: false };
    }

    case 'parse_boolean': {
      const lowerStr = str.toLowerCase().trim();
      if (rule.true_values.map(v => v.toLowerCase()).includes(lowerStr)) {
        return { value: true, skip: false };
      }
      if (rule.false_values.map(v => v.toLowerCase()).includes(lowerStr)) {
        return { value: false, skip: false };
      }
      return { value: null, skip: false };
    }

    case 'parse_date': {
      const parsed = parseDate(str, rule.format);
      return { value: parsed, skip: false };
    }

    case 'parse_percentage': {
      const cleaned = str.replace(/%/g, '').trim();
      const num = parseFloat(cleaned);
      if (isNaN(num)) {
        return { value: null, skip: false };
      }
      return { value: rule.as_decimal ? num / 100 : num, skip: false };
    }

    // Validation
    case 'validate_email': {
      const isValid = EMAIL_REGEX.test(str.trim());
      if (!isValid) {
        switch (rule.on_invalid) {
          case 'skip':
            return { value: null, skip: true };
          case 'null':
            return { value: null, skip: false };
          case 'keep':
            return { value: str, skip: false };
        }
      }
      return { value: str.trim().toLowerCase(), skip: false };
    }

    case 'validate_phone': {
      const digitsOnly = str.replace(/\D/g, '');
      const isValid = digitsOnly.length >= 10;
      if (!isValid) {
        switch (rule.on_invalid) {
          case 'skip':
            return { value: null, skip: true };
          case 'null':
            return { value: null, skip: false };
          case 'keep':
            return { value: str, skip: false };
        }
      }
      // Format as E.164 if requested
      if (rule.format === 'e164') {
        const formatted = digitsOnly.startsWith('1')
          ? `+${digitsOnly}`
          : `+1${digitsOnly}`;
        return { value: formatted, skip: false };
      }
      return { value: str, skip: false };
    }

    case 'validate_url': {
      const isValid = URL_REGEX.test(str.trim());
      if (!isValid) {
        switch (rule.on_invalid) {
          case 'skip':
            return { value: null, skip: true };
          case 'null':
            return { value: null, skip: false };
          case 'keep':
            return { value: str, skip: false };
        }
      }
      return { value: str.trim(), skip: false };
    }

    // Transformations
    case 'find_replace': {
      if (rule.regex) {
        const regex = new RegExp(rule.find, 'g');
        return { value: str.replace(regex, rule.replace), skip: false };
      }
      return { value: str.split(rule.find).join(rule.replace), skip: false };
    }

    case 'split': {
      const parts = str.split(rule.delimiter);
      const part = parts[rule.take_index];
      return { value: part ?? null, skip: false };
    }

    case 'prefix':
      return { value: `${rule.value}${str}`, skip: false };

    case 'suffix':
      return { value: `${str}${rule.value}`, skip: false };

    default:
      return { value: str, skip: false };
  }
}

/**
 * Apply all cleaning rules for a column to a value
 */
export function applyColumnRules(
  value: unknown,
  rules: CleaningRule[]
): CleaningResult {
  let result: CleaningResult = { value, skip: false };

  for (const rule of rules) {
    result = applyRule(result.value, rule);
    if (result.skip) {
      return result;
    }
  }

  return result;
}

/**
 * Clean an entire row based on column configuration
 */
export function cleanRow(
  row: Record<string, unknown>,
  config: ColumnConfiguration
): { cleanedRow: Record<string, unknown> | null; skipped: boolean } {
  const cleanedRow: Record<string, unknown> = {};

  for (const column of config.columns) {
    // Skip excluded columns
    if (!column.included) {
      continue;
    }

    const sourceValue = row[column.source_name];
    const result = applyColumnRules(sourceValue, column.cleaning_rules);

    // If any column rule says to skip the row, skip it
    if (result.skip) {
      return { cleanedRow: null, skipped: true };
    }

    cleanedRow[column.target_name] = result.value;
  }

  return { cleanedRow, skipped: false };
}

// =============================================================================
// Row Filtering
// =============================================================================

/**
 * Check if a row matches a filter condition
 */
export function matchesFilter(row: Record<string, unknown>, filter: RowFilter): boolean {
  const value = row[filter.column];
  const filterValue = filter.value;

  switch (filter.operator) {
    case 'equals':
      return String(value) === String(filterValue);

    case 'not_equals':
      return String(value) !== String(filterValue);

    case 'contains':
      return String(value).toLowerCase().includes(String(filterValue).toLowerCase());

    case 'not_contains':
      return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());

    case 'is_empty':
      return value === null || value === undefined || value === '';

    case 'is_not_empty':
      return value !== null && value !== undefined && value !== '';

    case 'greater_than':
      return Number(value) > Number(filterValue);

    case 'less_than':
      return Number(value) < Number(filterValue);

    default:
      return true;
  }
}

/**
 * Check if a row should be included based on all filters
 */
export function shouldIncludeRow(
  row: Record<string, unknown>,
  filters: RowFilter[]
): boolean {
  for (const filter of filters) {
    const matches = matchesFilter(row, filter);

    if (filter.action === 'include' && !matches) {
      return false;
    }

    if (filter.action === 'exclude' && matches) {
      return false;
    }
  }

  return true;
}

// =============================================================================
// Duplicate Handling
// =============================================================================

/**
 * Generate a unique key for a row based on key columns
 */
export function getRowKey(row: Record<string, unknown>, keyColumns: string[]): string {
  return keyColumns.map(col => String(row[col] ?? '')).join('|');
}

/**
 * Remove duplicates from rows based on strategy
 */
export function handleDuplicates(
  rows: Record<string, unknown>[],
  keyColumns: string[],
  strategy: 'keep_all' | 'keep_first' | 'keep_last' | 'skip_all'
): Record<string, unknown>[] {
  if (strategy === 'keep_all' || keyColumns.length === 0) {
    return rows;
  }

  const seen = new Map<string, number[]>();

  // First pass: identify duplicates
  rows.forEach((row, index) => {
    const key = getRowKey(row, keyColumns);
    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key)!.push(index);
  });

  // Second pass: filter based on strategy
  const indicesToKeep = new Set<number>();

  for (const [, indices] of seen) {
    if (strategy === 'skip_all' && indices.length > 1) {
      // Skip all duplicates - don't keep any
      continue;
    }

    if (strategy === 'keep_first') {
      indicesToKeep.add(indices[0]);
    } else if (strategy === 'keep_last') {
      indicesToKeep.add(indices[indices.length - 1]);
    }
  }

  return rows.filter((_, index) => indicesToKeep.has(index));
}

// =============================================================================
// Batch Processing
// =============================================================================

/**
 * Process a batch of rows with cleaning, filtering, and duplicate handling
 */
export function processRows(
  rows: Record<string, unknown>[],
  config: ColumnConfiguration
): {
  cleanedRows: Record<string, unknown>[];
  skippedCount: number;
} {
  let cleanedRows: Record<string, unknown>[] = [];
  let skippedCount = 0;

  // Step 1: Apply row filters
  const filteredRows = rows.filter(row => shouldIncludeRow(row, config.row_filters));
  skippedCount += rows.length - filteredRows.length;

  // Step 2: Clean each row
  for (const row of filteredRows) {
    const { cleanedRow, skipped } = cleanRow(row, config);
    if (skipped) {
      skippedCount++;
    } else if (cleanedRow) {
      cleanedRows.push(cleanedRow);
    }
  }

  // Step 3: Handle duplicates
  const keyColumns = config.duplicate_key_columns ?? [];
  cleanedRows = handleDuplicates(cleanedRows, keyColumns, config.duplicate_handling);

  return { cleanedRows, skippedCount };
}

// =============================================================================
// Smart Suggestions
// =============================================================================

/**
 * Suggest cleaning rules based on column analysis
 */
export function suggestCleaningRules(column: ColumnPreview): CleaningRule[] {
  const suggestions: CleaningRule[] = [];

  // Check for whitespace issues
  const hasWhitespaceIssues = column.sample_values.some(
    (v: string) => v !== v.trim() || /\s{2,}/.test(v)
  );
  if (hasWhitespaceIssues) {
    suggestions.push({ type: 'trim' });
  }

  // Suggest based on detected type
  switch (column.detected_type) {
    case 'email':
      suggestions.push({ type: 'lowercase' });
      suggestions.push({ type: 'validate_email', on_invalid: 'skip' });
      break;

    case 'phone':
      suggestions.push({ type: 'validate_phone', format: 'e164', on_invalid: 'skip' });
      break;

    case 'number': {
      const hasCurrency = column.sample_values.some((v: string) => /[$€£]/.test(v));
      if (hasCurrency) {
        suggestions.push({ type: 'parse_number', remove_chars: '$€£,' });
      }
      break;
    }

    case 'boolean': {
      const hasYesNo = column.sample_values.some((v: string) =>
        ['yes', 'no', 'y', 'n'].includes(v.toLowerCase())
      );
      if (hasYesNo) {
        suggestions.push({
          type: 'parse_boolean',
          true_values: ['yes', 'y', '1', 'true'],
          false_values: ['no', 'n', '0', 'false'],
        });
      }
      break;
    }
  }

  // Check for high null percentage
  if (column.null_count > column.sample_values.length * 0.5) {
    // Suggest excluding column with many nulls
    // This would be shown as a UI hint rather than a cleaning rule
  }

  return suggestions;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a date string with a specific format
 */
function parseDate(str: string, format: string): string | null {
  // Simple format patterns
  const patterns: Record<string, RegExp> = {
    'MM/DD/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'DD/MM/YYYY': /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    'YYYY-MM-DD': /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    'MM-DD-YYYY': /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  };

  const pattern = patterns[format];
  if (!pattern) {
    // Try native parsing as fallback
    const date = new Date(str);
    return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
  }

  const match = str.trim().match(pattern);
  if (!match) {
    return null;
  }

  let year: string, month: string, day: string;

  switch (format) {
    case 'MM/DD/YYYY':
    case 'MM-DD-YYYY':
      [, month, day, year] = match;
      break;
    case 'DD/MM/YYYY':
      [, day, month, year] = match;
      break;
    case 'YYYY-MM-DD':
      [, year, month, day] = match;
      break;
    default:
      return null;
  }

  // Validate and format
  const y = parseInt(year, 10);
  const m = parseInt(month, 10);
  const d = parseInt(day, 10);

  if (m < 1 || m > 12 || d < 1 || d > 31) {
    return null;
  }

  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/**
 * Generate default column configuration from preview
 */
export function generateDefaultColumnConfig(columns: ColumnPreview[]): ColumnConfig[] {
  return columns.map(col => ({
    source_name: col.name,
    target_name: toSnakeCase(col.name),
    type: mapDetectedTypeToColumnType(col.detected_type),
    included: true,
    cleaning_rules: suggestCleaningRules(col),
  }));
}

/**
 * Convert a string to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Map detected type to storage column type
 */
function mapDetectedTypeToColumnType(
  detectedType: DetectedType
): ColumnConfig['type'] {
  switch (detectedType) {
    case 'email':
    case 'phone':
    case 'url':
    case 'text':
      return 'text';
    case 'number':
      return 'number';
    case 'integer':
      return 'integer';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'date';
    case 'timestamp':
      return 'timestamp';
    default:
      return 'text';
  }
}
