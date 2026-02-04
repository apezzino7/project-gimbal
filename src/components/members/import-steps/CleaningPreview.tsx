import { useMemo } from 'react';
import type { CleaningRule } from '@/types/dataImport';
import type { ExtendedColumnConfig } from '../ImportWizard';
import { Badge } from '../../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface CleaningPreviewProps {
  /** Sample data rows (first 10) */
  sampleRows: Record<string, unknown>[];
  /** Column configurations with cleaning rules */
  columns: ExtendedColumnConfig[];
}

interface CleanedRow {
  original: Record<string, unknown>;
  cleaned: Record<string, unknown>;
  skipped: boolean;
  skipReason?: string;
}

// =============================================================================
// Cleaning Logic
// =============================================================================

/**
 * Apply a single cleaning rule to a value.
 */
function applyRule(value: unknown, rule: CleaningRule): { value: unknown; skip: boolean; reason?: string } {
  if (value === null || value === undefined) {
    if (rule.type === 'null_to_default') {
      return { value: rule.default_value, skip: false };
    }
    if (rule.type === 'skip_if_empty') {
      return { value: null, skip: true, reason: 'Empty value' };
    }
    return { value, skip: false };
  }

  const strValue = String(value);

  switch (rule.type) {
    case 'trim':
      return { value: strValue.trim(), skip: false };

    case 'collapse_whitespace':
      return { value: strValue.replace(/\s+/g, ' ').trim(), skip: false };

    case 'lowercase':
      return { value: strValue.toLowerCase(), skip: false };

    case 'uppercase':
      return { value: strValue.toUpperCase(), skip: false };

    case 'title_case':
      return {
        value: strValue.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        skip: false,
      };

    case 'empty_to_null':
      return { value: strValue.trim() === '' ? null : strValue, skip: false };

    case 'validate_email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(strValue);
      if (!isValid) {
        if (rule.on_invalid === 'skip') {
          return { value: null, skip: true, reason: 'Invalid email' };
        }
        if (rule.on_invalid === 'null') {
          return { value: null, skip: false };
        }
      }
      return { value: strValue, skip: false };
    }

    case 'validate_phone': {
      // Simple E.164 format check: +[country code][number]
      const phoneRegex = /^\+?[1-9]\d{6,14}$/;
      const cleanPhone = strValue.replace(/[\s\-\(\)\.]/g, '');
      const isValid = phoneRegex.test(cleanPhone);
      if (!isValid) {
        if (rule.on_invalid === 'skip') {
          return { value: null, skip: true, reason: 'Invalid phone' };
        }
        if (rule.on_invalid === 'null') {
          return { value: null, skip: false };
        }
      }
      return { value: cleanPhone, skip: false };
    }

    case 'validate_url': {
      try {
        new URL(strValue);
        return { value: strValue, skip: false };
      } catch {
        if (rule.on_invalid === 'skip') {
          return { value: null, skip: true, reason: 'Invalid URL' };
        }
        if (rule.on_invalid === 'null') {
          return { value: null, skip: false };
        }
        return { value: strValue, skip: false };
      }
    }

    case 'parse_number': {
      const cleanStr = rule.remove_chars
        ? strValue.replace(new RegExp(`[${rule.remove_chars}]`, 'g'), '')
        : strValue.replace(/[^0-9.\-]/g, '');
      const num = parseFloat(cleanStr);
      return { value: isNaN(num) ? null : num, skip: false };
    }

    case 'parse_date': {
      const date = new Date(strValue);
      return { value: isNaN(date.getTime()) ? null : date.toISOString().split('T')[0], skip: false };
    }

    default:
      return { value, skip: false };
  }
}

/**
 * Apply all cleaning rules to a row.
 */
function cleanRow(
  row: Record<string, unknown>,
  columns: ExtendedColumnConfig[]
): CleanedRow {
  const cleaned: Record<string, unknown> = {};
  let skipped = false;
  let skipReason: string | undefined;

  for (const col of columns) {
    if (!col.included) continue;

    let value = row[col.source_name];

    for (const rule of col.cleaning_rules) {
      const result = applyRule(value, rule);
      value = result.value;
      if (result.skip) {
        skipped = true;
        skipReason = result.reason;
        break;
      }
    }

    cleaned[col.target_name] = value;
  }

  return {
    original: row,
    cleaned,
    skipped,
    skipReason,
  };
}

// =============================================================================
// Icons
// =============================================================================

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 5: Preview data after cleaning rules are applied.
 * Shows before/after comparison and highlights skipped rows.
 */
export function CleaningPreview({ sampleRows, columns }: CleaningPreviewProps) {
  const cleanedData = useMemo(() => {
    return sampleRows.map((row) => cleanRow(row, columns));
  }, [sampleRows, columns]);

  const skippedCount = cleanedData.filter((r) => r.skipped).length;
  const passCount = cleanedData.length - skippedCount;
  const includedColumns = columns.filter((c) => c.included);
  const rulesApplied = columns.reduce((sum, c) => sum + c.cleaning_rules.length, 0);

  // Find columns where values changed
  const changedColumns = useMemo(() => {
    const changed = new Set<string>();
    for (const row of cleanedData) {
      for (const col of includedColumns) {
        const original = String(row.original[col.source_name] ?? '');
        const cleaned = String(row.cleaned[col.target_name] ?? '');
        if (original !== cleaned) {
          changed.add(col.source_name);
        }
      }
    }
    return changed;
  }, [cleanedData, includedColumns]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Preview Cleaned Data</h2>
        <p className="text-gray-500 text-sm">
          See how your data will look after cleaning rules are applied.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-[#f5f5f5] rounded-lg">
          <div className="text-2xl font-bold text-[#003559]">{sampleRows.length}</div>
          <div className="text-xs text-gray-500">Sample Rows</div>
        </div>
        <div className="text-center p-3 bg-[#2e7d32]/10 rounded-lg">
          <div className="text-2xl font-bold text-[#2e7d32]">{passCount}</div>
          <div className="text-xs text-gray-500">Will Import</div>
        </div>
        <div className="text-center p-3 bg-[#ed6c02]/10 rounded-lg">
          <div className="text-2xl font-bold text-[#ed6c02]">{skippedCount}</div>
          <div className="text-xs text-gray-500">Will Skip</div>
        </div>
        <div className="text-center p-3 bg-[#0353a4]/10 rounded-lg">
          <div className="text-2xl font-bold text-[#0353a4]">{rulesApplied}</div>
          <div className="text-xs text-gray-500">Rules Applied</div>
        </div>
      </div>

      {/* Changed columns indicator */}
      {changedColumns.size > 0 && (
        <div className="bg-[#b9d6f2]/20 border border-[#b9d6f2] rounded-lg p-4">
          <div className="text-sm font-medium text-[#003559] mb-2">
            Columns with changes:
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(changedColumns).map((colName) => (
              <Badge key={colName} variant="primary" size="sm">
                {colName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Data preview table */}
      <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e0e0e0]">
            <thead className="bg-[#f5f5f5]">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                {includedColumns.slice(0, 5).map((col) => (
                  <th
                    key={col.source_name}
                    className={[
                      'px-3 py-2 text-left text-xs font-medium uppercase',
                      changedColumns.has(col.source_name) ? 'text-[#0353a4]' : 'text-gray-500',
                    ].join(' ')}
                  >
                    {col.target_name}
                    {changedColumns.has(col.source_name) && ' *'}
                  </th>
                ))}
                {includedColumns.length > 5 && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">
                    +{includedColumns.length - 5} more
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-[#e0e0e0]">
              {cleanedData.map((row, idx) => (
                <tr key={idx} className={row.skipped ? 'bg-[#ed6c02]/5' : ''}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {row.skipped ? (
                      <div className="flex items-center gap-1 text-[#ed6c02]">
                        <XIcon />
                        <span className="text-xs">{row.skipReason}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[#2e7d32]">
                        <CheckIcon />
                        <span className="text-xs">OK</span>
                      </div>
                    )}
                  </td>
                  {includedColumns.slice(0, 5).map((col) => {
                    const original = String(row.original[col.source_name] ?? '');
                    const cleaned = String(row.cleaned[col.target_name] ?? '');
                    const hasChange = original !== cleaned;

                    return (
                      <td key={col.source_name} className="px-3 py-2">
                        {hasChange ? (
                          <div className="flex items-center gap-1 text-sm">
                            <span className="text-gray-400 line-through truncate max-w-[80px]">
                              {original || '(empty)'}
                            </span>
                            <ArrowRightIcon />
                            <span className="text-[#003559] font-medium truncate max-w-[80px]">
                              {cleaned || '(null)'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600 truncate max-w-[160px] block">
                            {cleaned || '(empty)'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {includedColumns.length > 5 && (
                    <td className="px-3 py-2 text-xs text-gray-400">...</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning if many rows will be skipped */}
      {skippedCount > 0 && (
        <div className="p-4 bg-[#ed6c02]/10 border border-[#ed6c02]/20 rounded-lg">
          <div className="text-sm text-[#ed6c02]">
            <strong>Note:</strong> {skippedCount} of {sampleRows.length} sample rows will be skipped due to validation rules.
            {skippedCount === sampleRows.length && (
              <span> You may want to adjust your cleaning rules.</span>
            )}
          </div>
        </div>
      )}

      {/* Info about sample */}
      <div className="text-center text-xs text-gray-400">
        Showing first {sampleRows.length} rows as a preview. Full import will process all rows.
      </div>
    </div>
  );
}

export default CleaningPreview;
