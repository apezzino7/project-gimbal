import { useCallback } from 'react';
import type { MemberImportMapping, CreateMemberInput } from '@/types/member';
import type { ColumnPreview } from '@/services/members/memberImportService';
import { Select } from '../../common/Select';
import { Badge } from '../../common/Badge';

// =============================================================================
// Types
// =============================================================================

export interface ColumnMappingProps {
  /** Column preview data */
  columns: ColumnPreview[];
  /** Current mappings */
  mappings: MemberImportMapping[];
  /** Called when mappings change */
  onChange: (mappings: MemberImportMapping[]) => void;
}

// =============================================================================
// Constants
// =============================================================================

const MEMBER_FIELDS: Array<{ value: keyof CreateMemberInput | 'skip'; label: string; group: string }> = [
  { value: 'skip', label: 'Skip (Do not import)', group: 'Other' },
  { value: 'firstName', label: 'First Name', group: 'Basic Info' },
  { value: 'lastName', label: 'Last Name', group: 'Basic Info' },
  { value: 'email', label: 'Email Address', group: 'Basic Info' },
  { value: 'phone', label: 'Phone Number', group: 'Basic Info' },
  { value: 'dateOfBirth', label: 'Date of Birth', group: 'Basic Info' },
  { value: 'gender', label: 'Gender', group: 'Basic Info' },
  { value: 'externalId', label: 'External ID', group: 'Basic Info' },
  { value: 'addressLine1', label: 'Address Line 1', group: 'Address' },
  { value: 'addressLine2', label: 'Address Line 2', group: 'Address' },
  { value: 'city', label: 'City', group: 'Address' },
  { value: 'state', label: 'State', group: 'Address' },
  { value: 'postalCode', label: 'ZIP/Postal Code', group: 'Address' },
  { value: 'country', label: 'Country', group: 'Address' },
  { value: 'membershipStartDate', label: 'Membership Start Date', group: 'Membership' },
  { value: 'membershipExpiryDate', label: 'Membership Expiry Date', group: 'Membership' },
  { value: 'membershipStatus', label: 'Membership Status', group: 'Membership' },
  { value: 'membershipLevelId', label: 'Membership Level', group: 'Membership' },
  { value: 'acquisitionSource', label: 'Acquisition Source', group: 'Attribution' },
  { value: 'acquisitionPromoCode', label: 'Promo Code', group: 'Attribution' },
  { value: 'acquisitionCost', label: 'Acquisition Cost (CAC)', group: 'Attribution' },
  { value: 'tags', label: 'Tags (comma-separated)', group: 'Other' },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Step 3: Column mapping - map source columns to member fields.
 */
export function ColumnMapping({ columns, mappings, onChange }: ColumnMappingProps) {
  const handleMappingChange = useCallback(
    (sourceColumn: string, targetField: string) => {
      const newMappings = mappings.map((m) =>
        m.sourceColumn === sourceColumn
          ? { ...m, targetField: targetField as keyof CreateMemberInput | 'skip' }
          : m
      );
      onChange(newMappings);
    },
    [mappings, onChange]
  );

  const getMappingForColumn = (columnName: string): string => {
    const mapping = mappings.find((m) => m.sourceColumn === columnName);
    return mapping?.targetField || 'skip';
  };

  const getUsedFields = (): Set<string> => {
    const used = new Set<string>();
    for (const mapping of mappings) {
      if (mapping.targetField !== 'skip') {
        used.add(mapping.targetField);
      }
    }
    return used;
  };

  const usedFields = getUsedFields();

  const getFieldLabel = (field: keyof CreateMemberInput | 'skip'): string => {
    return MEMBER_FIELDS.find((f) => f.value === field)?.label || field;
  };

  const getMappedCount = (): number => {
    return mappings.filter((m) => m.targetField !== 'skip').length;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Map Columns</h2>
        <p className="text-gray-500 text-sm">
          Match your CSV columns to member fields. We've suggested mappings based on column names.
        </p>
      </div>

      {/* Summary */}
      <div className="flex justify-center gap-6 text-center">
        <div>
          <div className="text-2xl font-bold text-[#2e7d32]">{getMappedCount()}</div>
          <div className="text-sm text-gray-500">Mapped</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-400">
            {columns.length - getMappedCount()}
          </div>
          <div className="text-sm text-gray-500">Skipped</div>
        </div>
      </div>

      {/* Mappings */}
      <div className="border border-[#e0e0e0] rounded-lg overflow-hidden">
        <div className="bg-[#f5f5f5] px-4 py-2 border-b border-[#e0e0e0] grid grid-cols-[1fr,auto,1fr] gap-4 items-center">
          <span className="text-sm font-medium text-[#003559]">Source Column</span>
          <span className="text-gray-400">→</span>
          <span className="text-sm font-medium text-[#003559]">Member Field</span>
        </div>
        <div className="divide-y divide-[#e0e0e0]">
          {columns.map((col) => {
            const currentMapping = getMappingForColumn(col.name);
            const isSkipped = currentMapping === 'skip';

            return (
              <div
                key={col.name}
                className={[
                  'grid grid-cols-[1fr,auto,1fr] gap-4 items-center px-4 py-3',
                  isSkipped ? 'bg-gray-50/50' : '',
                ].join(' ')}
              >
                {/* Source column */}
                <div>
                  <div className={['font-medium', isSkipped ? 'text-gray-400' : 'text-[#003559]'].join(' ')}>
                    {col.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    {col.sampleValues[0] || 'No sample'}
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-gray-400">→</div>

                {/* Target field */}
                <div className="flex items-center gap-2">
                  <Select
                    value={currentMapping}
                    onChange={(e) => handleMappingChange(col.name, e.target.value)}
                    options={MEMBER_FIELDS.map((f) => ({
                      value: f.value,
                      label: f.label,
                      disabled: f.value !== 'skip' && f.value !== currentMapping && usedFields.has(f.value),
                    }))}
                    className="flex-1"
                    size="sm"
                  />
                  {!isSkipped && (
                    <Badge variant="success" size="sm">
                      {getFieldLabel(currentMapping as keyof CreateMemberInput)}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Validation warnings */}
      {!mappings.some((m) => m.targetField === 'email') &&
        !mappings.some((m) => m.targetField === 'phone') &&
        !mappings.some((m) => m.targetField === 'externalId') && (
          <div className="p-4 bg-[#ed6c02]/10 border border-[#ed6c02]/20 rounded-lg text-sm text-[#ed6c02]">
            <strong>Warning:</strong> At least one identifier (email, phone, or external ID) should be
            mapped for duplicate detection.
          </div>
        )}
    </div>
  );
}

export default ColumnMapping;
