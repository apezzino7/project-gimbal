import type { DuplicateStrategy } from '@/types/dataImport';
import { Badge } from '../../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface DuplicateHandlingProps {
  /** Selected duplicate detection fields */
  matchFields: string[];
  /** Available fields for matching */
  availableFields: Array<{ value: string; label: string }>;
  /** Selected duplicate strategy */
  strategy: DuplicateStrategy;
  /** Called when match fields change */
  onMatchFieldsChange: (fields: string[]) => void;
  /** Called when strategy changes */
  onStrategyChange: (strategy: DuplicateStrategy) => void;
}

interface StrategyOption {
  value: DuplicateStrategy;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// =============================================================================
// Constants
// =============================================================================

const STRATEGIES: StrategyOption[] = [
  {
    value: 'skip_all',
    label: 'Skip Duplicates',
    description: 'Do not import rows that match existing members',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
  {
    value: 'keep_first',
    label: 'Keep First',
    description: 'Import first occurrence, skip subsequent duplicates',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    value: 'keep_last',
    label: 'Keep Last',
    description: 'Skip earlier occurrences, import the latest duplicate',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    value: 'keep_all',
    label: 'Keep All',
    description: 'Import all rows including duplicates (may create duplicate members)',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
];

const RECOMMENDED_FIELDS = ['email', 'phone', 'externalId'];

// =============================================================================
// Component
// =============================================================================

/**
 * Step 5: Duplicate handling - configure how to detect and handle duplicates.
 */
export function DuplicateHandling({
  matchFields,
  availableFields,
  strategy,
  onMatchFieldsChange,
  onStrategyChange,
}: DuplicateHandlingProps) {
  const toggleMatchField = (field: string) => {
    if (matchFields.includes(field)) {
      onMatchFieldsChange(matchFields.filter((f) => f !== field));
    } else {
      onMatchFieldsChange([...matchFields, field]);
    }
  };

  const hasRecommendedField = matchFields.some((f) => RECOMMENDED_FIELDS.includes(f));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Duplicate Handling</h2>
        <p className="text-gray-500 text-sm">
          Choose how to identify and handle duplicate records during import.
        </p>
      </div>

      {/* Match fields selection */}
      <div className="border border-[#e0e0e0] rounded-lg p-4">
        <div className="text-sm font-medium text-[#003559] mb-3">
          Match Duplicates By
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Select fields to use for detecting duplicate members. Members with matching values in ALL selected fields will be considered duplicates.
        </p>

        <div className="flex flex-wrap gap-2">
          {availableFields.map((field) => {
            const isSelected = matchFields.includes(field.value);
            const isRecommended = RECOMMENDED_FIELDS.includes(field.value);

            return (
              <button
                key={field.value}
                type="button"
                onClick={() => toggleMatchField(field.value)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  isSelected
                    ? 'bg-[#0353a4] text-white border-[#0353a4]'
                    : 'bg-white text-gray-600 border-[#e0e0e0] hover:border-[#0353a4]',
                ].join(' ')}
              >
                {field.label}
                {isRecommended && !isSelected && (
                  <span className="ml-1 text-xs opacity-60">*</span>
                )}
              </button>
            );
          })}
        </div>

        {availableFields.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No identifier fields mapped. Map email, phone, or external ID in the previous step.
          </div>
        )}

        {matchFields.length > 0 && (
          <div className="mt-3 text-xs text-gray-500">
            Duplicates will be detected when{' '}
            <span className="font-medium text-[#003559]">
              {matchFields.length === 1
                ? `${matchFields[0]} matches`
                : `ALL of: ${matchFields.join(', ')} match`}
            </span>
          </div>
        )}
      </div>

      {/* Warning if no recommended field */}
      {matchFields.length > 0 && !hasRecommendedField && (
        <div className="p-4 bg-[#ed6c02]/10 border border-[#ed6c02]/20 rounded-lg text-sm text-[#ed6c02]">
          <strong>Warning:</strong> Using fields other than email, phone, or external ID may result in unreliable duplicate detection.
        </div>
      )}

      {/* Strategy selection */}
      <div>
        <div className="text-sm font-medium text-[#003559] mb-3">
          When Duplicates Are Found
        </div>

        <div className="grid gap-3">
          {STRATEGIES.map((opt) => {
            const isSelected = strategy === opt.value;

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onStrategyChange(opt.value)}
                className={[
                  'flex items-start gap-4 p-4 rounded-lg border text-left transition-colors',
                  isSelected
                    ? 'border-[#0353a4] bg-[#b9d6f2]/10'
                    : 'border-[#e0e0e0] bg-white hover:border-[#0353a4]',
                ].join(' ')}
              >
                <div className={[
                  'shrink-0 p-2 rounded-lg',
                  isSelected ? 'bg-[#0353a4] text-white' : 'bg-[#f5f5f5] text-gray-500',
                ].join(' ')}>
                  {opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={['font-medium', isSelected ? 'text-[#003559]' : 'text-gray-700'].join(' ')}>
                      {opt.label}
                    </span>
                    {opt.value === 'skip_all' && (
                      <Badge variant="success" size="sm">Recommended</Badge>
                    )}
                    {opt.value === 'keep_all' && (
                      <Badge variant="warning" size="sm">Caution</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{opt.description}</p>
                </div>
                <div className={[
                  'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-[#0353a4]' : 'border-[#e0e0e0]',
                ].join(' ')}>
                  {isSelected && (
                    <div className="w-3 h-3 rounded-full bg-[#0353a4]" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Example scenario */}
      <div className="bg-[#f5f5f5] rounded-lg p-4">
        <div className="text-sm font-medium text-[#003559] mb-2">Example</div>
        <p className="text-sm text-gray-600">
          {matchFields.length === 0 ? (
            'Select match fields above to see how duplicates will be handled.'
          ) : strategy === 'skip_all' ? (
            `If importing a member with ${matchFields.join(' and ')} that already exists in your database, the row will be skipped.`
          ) : strategy === 'keep_first' ? (
            `If your import file contains multiple rows with the same ${matchFields.join(' and ')}, only the first row will be imported.`
          ) : strategy === 'keep_last' ? (
            `If your import file contains multiple rows with the same ${matchFields.join(' and ')}, only the last row will be imported.`
          ) : (
            `All rows will be imported, potentially creating duplicate member records with the same ${matchFields.join(' and ')}.`
          )}
        </p>
      </div>
    </div>
  );
}

export default DuplicateHandling;
