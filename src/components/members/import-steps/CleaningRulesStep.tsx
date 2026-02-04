import { useState, useCallback } from 'react';
import type { ColumnConfig, CleaningRule } from '@/types/dataImport';
import type { ExtendedColumnConfig } from '../ImportWizard';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { Select } from '../../common/Select';

// =============================================================================
// Types
// =============================================================================

export interface CleaningRulesStepProps {
  /** Column configurations with cleaning rules and detected types */
  columns: ExtendedColumnConfig[];
  /** Called when configurations change */
  onChange: (columns: ExtendedColumnConfig[]) => void;
}

// Extended type for applicability checking (includes detected types)
type ApplicableColumnType = ColumnConfig['type'] | 'email' | 'phone' | 'url';

interface RuleOption {
  value: CleaningRule['type'];
  label: string;
  description: string;
  applicableTo: ApplicableColumnType[];
}

// =============================================================================
// Constants
// =============================================================================

const CLEANING_RULES: RuleOption[] = [
  // Whitespace
  { value: 'trim', label: 'Trim whitespace', description: 'Remove leading/trailing spaces', applicableTo: ['text', 'email', 'phone', 'url'] },
  { value: 'collapse_whitespace', label: 'Collapse whitespace', description: 'Replace multiple spaces with single', applicableTo: ['text'] },

  // Case
  { value: 'lowercase', label: 'Lowercase', description: 'Convert to lowercase', applicableTo: ['text', 'email'] },
  { value: 'uppercase', label: 'Uppercase', description: 'Convert to uppercase', applicableTo: ['text'] },
  { value: 'title_case', label: 'Title Case', description: 'Capitalize first letter of each word', applicableTo: ['text'] },

  // Null handling
  { value: 'empty_to_null', label: 'Empty to null', description: 'Convert empty strings to null', applicableTo: ['text', 'number', 'integer', 'date', 'timestamp'] },

  // Validation
  { value: 'validate_email', label: 'Validate email', description: 'Check email format', applicableTo: ['text', 'email'] },
  { value: 'validate_phone', label: 'Validate phone', description: 'Check phone format (E.164)', applicableTo: ['text', 'phone'] },
  { value: 'validate_url', label: 'Validate URL', description: 'Check URL format', applicableTo: ['text', 'url'] },

  // Type coercion
  { value: 'parse_number', label: 'Parse number', description: 'Convert to number', applicableTo: ['text'] },
  { value: 'parse_date', label: 'Parse date', description: 'Convert to date', applicableTo: ['text'] },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Step 4: Cleaning rules - configure data cleaning per column.
 */
export function CleaningRulesStep({ columns, onChange }: CleaningRulesStepProps) {
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);

  // Filter rules based on DETECTED type (not storage type) for better suggestions
  const getAvailableRules = (column: ExtendedColumnConfig): RuleOption[] => {
    const detectedType = column.detectedType as ApplicableColumnType;
    return CLEANING_RULES.filter((rule) =>
      rule.applicableTo.includes(detectedType) || rule.applicableTo.includes(column.type)
    );
  };

  const hasRule = (column: ExtendedColumnConfig, ruleType: CleaningRule['type']): boolean => {
    return column.cleaning_rules.some((r) => r.type === ruleType);
  };

  // Get display label for detected type
  const getDetectedTypeLabel = (detectedType: string): string => {
    const labels: Record<string, string> = {
      email: '📧 Email',
      phone: '📱 Phone',
      url: '🔗 URL',
      date: '📅 Date',
      timestamp: '🕐 Timestamp',
      number: '🔢 Number',
      integer: '🔢 Integer',
      boolean: '✓ Boolean',
      text: 'Text',
    };
    return labels[detectedType] || detectedType;
  };

  const toggleRule = useCallback(
    (columnName: string, ruleType: CleaningRule['type']) => {
      const newColumns = columns.map((col) => {
        if (col.source_name !== columnName) return col;

        const hasExisting = col.cleaning_rules.some((r) => r.type === ruleType);
        let newRules: CleaningRule[];

        if (hasExisting) {
          newRules = col.cleaning_rules.filter((r) => r.type !== ruleType);
        } else {
          // Add rule with default config
          const newRule = createDefaultRule(ruleType);
          newRules = [...col.cleaning_rules, newRule];
        }

        return { ...col, cleaning_rules: newRules };
      });
      onChange(newColumns);
    },
    [columns, onChange]
  );

  const updateRuleConfig = useCallback(
    (columnName: string, ruleType: CleaningRule['type'], config: Partial<CleaningRule>) => {
      const newColumns = columns.map((col) => {
        if (col.source_name !== columnName) return col;

        const newRules = col.cleaning_rules.map((r) =>
          r.type === ruleType ? ({ ...r, ...config } as CleaningRule) : r
        );

        return { ...col, cleaning_rules: newRules };
      });
      onChange(newColumns);
    },
    [columns, onChange]
  );

  const toggleColumnIncluded = useCallback(
    (columnName: string) => {
      const newColumns = columns.map((col) =>
        col.source_name === columnName ? { ...col, included: !col.included } : col
      );
      onChange(newColumns);
    },
    [columns, onChange]
  );

  const getRuleCount = (column: ColumnConfig): number => {
    return column.cleaning_rules.length;
  };

  const includedCount = columns.filter((c) => c.included).length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Data Cleaning Rules</h2>
        <p className="text-gray-500 text-sm">
          Configure validation and transformation rules for each column.
        </p>
      </div>

      {/* Summary */}
      <div className="flex justify-center gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-[#003559]">{includedCount}</div>
          <div className="text-sm text-gray-500">Columns Included</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-[#0353a4]">
            {columns.reduce((sum, c) => sum + getRuleCount(c), 0)}
          </div>
          <div className="text-sm text-gray-500">Rules Applied</div>
        </div>
      </div>

      {/* Column list */}
      <div className="border border-[#e0e0e0] rounded-lg overflow-hidden divide-y divide-[#e0e0e0]">
        {columns.map((col) => {
          const isExpanded = expandedColumn === col.source_name;
          const availableRules = getAvailableRules(col);
          const ruleCount = getRuleCount(col);
          const isSemanticType = ['email', 'phone', 'url'].includes(col.detectedType);

          return (
            <div key={col.source_name} className={col.included ? '' : 'bg-gray-50/50'}>
              {/* Column header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#f5f5f5]"
                onClick={() => setExpandedColumn(isExpanded ? null : col.source_name)}
              >
                {/* Include toggle */}
                <input
                  type="checkbox"
                  checked={col.included}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleColumnIncluded(col.source_name);
                  }}
                  className="w-4 h-4 rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
                />

                {/* Column info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={['font-medium', col.included ? 'text-[#003559]' : 'text-gray-400'].join(' ')}>
                      {col.source_name}
                    </span>
                    {/* Show detected type with icon if it's a semantic type */}
                    {isSemanticType ? (
                      <Badge variant="primary" size="sm">
                        {getDetectedTypeLabel(col.detectedType)}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" size="sm">
                        {col.type}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    → {col.target_name}
                  </div>
                </div>

                {/* Rule count */}
                {ruleCount > 0 && (
                  <Badge variant="success" size="sm">
                    {ruleCount} rule{ruleCount > 1 ? 's' : ''}
                  </Badge>
                )}

                {/* Expand icon */}
                <svg
                  className={[
                    'w-5 h-5 text-gray-400 transition-transform',
                    isExpanded ? 'rotate-180' : '',
                  ].join(' ')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded rules panel */}
              {isExpanded && col.included && (
                <div className="px-4 py-3 bg-[#f5f5f5] border-t border-[#e0e0e0]">
                  <div className="text-sm font-medium text-[#003559] mb-3">Available Rules</div>
                  <div className="grid gap-2">
                    {availableRules.map((rule) => {
                      const isActive = hasRule(col, rule.value);
                      const activeRule = col.cleaning_rules.find((r) => r.type === rule.value);

                      return (
                        <div
                          key={rule.value}
                          className={[
                            'flex items-center gap-3 p-2 rounded border',
                            isActive ? 'border-[#0353a4] bg-white' : 'border-[#e0e0e0] bg-white',
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={isActive}
                            onChange={() => toggleRule(col.source_name, rule.value)}
                            className="w-4 h-4 rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-[#003559]">{rule.label}</div>
                            <div className="text-xs text-gray-500">{rule.description}</div>
                          </div>

                          {/* Rule-specific config */}
                          {isActive && activeRule && renderRuleConfig(activeRule, (config) =>
                            updateRuleConfig(col.source_name, rule.value, config)
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="flex justify-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const basicRules: CleaningRule[] = [
              { type: 'trim' },
              { type: 'empty_to_null' },
            ];
            const newColumns = columns.map((col) => ({
              ...col,
              cleaning_rules: basicRules,
            }));
            onChange(newColumns);
          }}
        >
          Apply Basic Rules to All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const newColumns = columns.map((col) => ({ ...col, cleaning_rules: [] }));
            onChange(newColumns);
          }}
        >
          Clear All Rules
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function createDefaultRule(type: CleaningRule['type']): CleaningRule {
  switch (type) {
    case 'validate_email':
      return { type: 'validate_email', on_invalid: 'skip' };
    case 'validate_phone':
      return { type: 'validate_phone', format: 'e164', on_invalid: 'skip' };
    case 'validate_url':
      return { type: 'validate_url', on_invalid: 'skip' };
    case 'parse_date':
      return { type: 'parse_date', format: 'YYYY-MM-DD' };
    case 'parse_number':
      return { type: 'parse_number' };
    case 'null_to_default':
      return { type: 'null_to_default', default_value: '' };
    case 'find_replace':
      return { type: 'find_replace', find: '', replace: '' };
    case 'split':
      return { type: 'split', delimiter: ',', take_index: 0 };
    case 'prefix':
      return { type: 'prefix', value: '' };
    case 'suffix':
      return { type: 'suffix', value: '' };
    case 'parse_boolean':
      return { type: 'parse_boolean', true_values: ['true', 'yes', '1'], false_values: ['false', 'no', '0'] };
    case 'parse_percentage':
      return { type: 'parse_percentage', as_decimal: true };
    default:
      return { type } as CleaningRule;
  }
}

function renderRuleConfig(
  rule: CleaningRule,
  onUpdate: (config: Partial<CleaningRule>) => void
): React.ReactNode {
  switch (rule.type) {
    case 'validate_email':
    case 'validate_phone':
    case 'validate_url':
      return (
        <Select
          value={(rule as { on_invalid: string }).on_invalid}
          onChange={(e) => onUpdate({ on_invalid: e.target.value as 'skip' | 'null' | 'keep' })}
          options={[
            { value: 'skip', label: 'Skip row' },
            { value: 'null', label: 'Set to null' },
            { value: 'keep', label: 'Keep value' },
          ]}
          size="sm"
          className="w-28"
        />
      );

    case 'parse_date':
      return (
        <Select
          value={(rule as { format: string }).format}
          onChange={(e) => onUpdate({ format: e.target.value })}
          options={[
            { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
            { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
            { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
            { value: 'auto', label: 'Auto-detect' },
          ]}
          size="sm"
          className="w-32"
        />
      );

    default:
      return null;
  }
}

export default CleaningRulesStep;
