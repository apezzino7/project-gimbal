import { useState, useCallback, useMemo } from 'react';
import type {
  MemberImportConfig,
  MemberImportMapping,
  MemberImportResult,
} from '@/types/member';
import type {
  ColumnConfig,
  CleaningRule,
  DuplicateStrategy,
  ScheduleConfiguration,
} from '@/types/dataImport';
import {
  parseCSVFile,
  generatePreview,
  suggestFieldMappings,
  importMembers,
} from '@/services/members/memberImportService';
import { createMemberImportDataSource } from '@/services/members/memberImportDataSourceService';
import type { ParsedCSVData, ImportPreview, ImportProgress, ColumnPreview } from '@/services/members/memberImportService';
import { Card, CardHeader, CardFooter } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

// Step components
import { SourceSelection } from './import-steps/SourceSelection';
import { DataPreview } from './import-steps/DataPreview';
import { ColumnMapping } from './import-steps/ColumnMapping';
import { CleaningRulesStep } from './import-steps/CleaningRulesStep';
import { CleaningPreview } from './import-steps/CleaningPreview';
import { DuplicateHandling } from './import-steps/DuplicateHandling';
import { SiteAssignment } from './import-steps/SiteAssignment';
import { ScheduleConfig } from './import-steps/ScheduleConfig';

// =============================================================================
// Types
// =============================================================================

export interface ImportWizardProps {
  /** Called when import is complete */
  onComplete?: (result: MemberImportResult) => void;
  /** Called when wizard is cancelled */
  onCancel?: () => void;
  /** Pre-selected site ID */
  siteId?: string;
  /** Additional class names */
  className?: string;
}

interface WizardState {
  // Step 1: Source
  file: File | null;
  parsedData: ParsedCSVData | null;

  // Step 2: Preview
  preview: ImportPreview | null;

  // Step 3: Mapping
  mappings: MemberImportMapping[];

  // Step 4: Cleaning - uses ExtendedColumnConfig with detectedType for smarter rules
  columnConfig: ExtendedColumnConfig[];

  // Step 5: Duplicates - uses DuplicateStrategy from dataImport types
  duplicateStrategy: DuplicateStrategy;
  matchFields: string[];

  // Step 6: Site
  siteId: string | null;
  membershipLevelId: string | null;
  defaultTags: string[];

  // Step 7: Schedule - uses ScheduleConfiguration from dataImport types
  schedule: ScheduleConfiguration;
}

type WizardStep =
  | 'source'
  | 'preview'
  | 'mapping'
  | 'cleaning'
  | 'preview_cleaning'
  | 'duplicates'
  | 'site'
  | 'schedule';

const STEPS: Array<{ id: WizardStep; title: string; description: string }> = [
  { id: 'source', title: 'Select Source', description: 'Upload CSV file' },
  { id: 'preview', title: 'Preview Data', description: 'Review detected columns' },
  { id: 'mapping', title: 'Map Columns', description: 'Match to member fields' },
  { id: 'cleaning', title: 'Cleaning Rules', description: 'Configure data validation' },
  { id: 'preview_cleaning', title: 'Preview Results', description: 'See cleaned data' },
  { id: 'duplicates', title: 'Duplicates', description: 'Handle existing members' },
  { id: 'site', title: 'Site Assignment', description: 'Select target site' },
  { id: 'schedule', title: 'Schedule', description: 'One-time or recurring' },
];

// Default schedule configuration
const DEFAULT_SCHEDULE: ScheduleConfiguration = {
  frequency: 'manual',
  retry_on_failure: true,
  max_retries: 3,
  retry_delay_minutes: 15,
};

// =============================================================================
// Icons
// =============================================================================

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Extended column config that preserves the detected semantic type.
 * This allows the cleaning rules step to suggest appropriate validations.
 */
export interface ExtendedColumnConfig extends ColumnConfig {
  /** Original detected type (may include 'email', 'phone', 'url') */
  detectedType: string;
}

/**
 * Convert ColumnPreview to ExtendedColumnConfig for the cleaning rules step.
 * Preserves the detected semantic type while mapping to storage type.
 */
function convertPreviewToConfig(
  preview: ColumnPreview,
  mapping: MemberImportMapping | undefined
): ExtendedColumnConfig {
  // Map DetectedType to storage ColumnType
  const typeMapping: Record<string, ColumnConfig['type']> = {
    text: 'text',
    number: 'number',
    integer: 'integer',
    boolean: 'boolean',
    date: 'date',
    timestamp: 'timestamp',
    email: 'text',
    phone: 'text',
    url: 'text',
  };

  const columnType = typeMapping[preview.detectedType] || 'text';
  const targetField = mapping?.targetField || 'skip';

  // Auto-suggest cleaning rules based on detected type
  const suggestedRules: CleaningRule[] = [];

  // Always suggest trim for text-like fields
  if (['text', 'email', 'phone', 'url'].includes(preview.detectedType)) {
    suggestedRules.push({ type: 'trim' });
  }

  // Add type-specific validations
  if (preview.detectedType === 'email') {
    suggestedRules.push({ type: 'lowercase' });
    suggestedRules.push({ type: 'validate_email', on_invalid: 'skip' });
  } else if (preview.detectedType === 'phone') {
    suggestedRules.push({ type: 'validate_phone', format: 'e164', on_invalid: 'skip' });
  } else if (preview.detectedType === 'url') {
    suggestedRules.push({ type: 'validate_url', on_invalid: 'skip' });
  }

  return {
    source_name: preview.name,
    target_name: targetField === 'skip' ? preview.name : targetField,
    type: columnType,
    included: targetField !== 'skip',
    cleaning_rules: suggestedRules,
    detectedType: preview.detectedType,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * 7-step import wizard for member data.
 *
 * Steps:
 * 1. Source Selection - CSV upload
 * 2. Data Preview - Review detected columns
 * 3. Column Mapping - Map to member fields
 * 4. Cleaning Rules - Data validation
 * 5. Duplicate Handling - Handle existing members
 * 6. Site Assignment - Select target site
 * 7. Schedule - One-time or recurring sync
 *
 * @example
 * <ImportWizard
 *   onComplete={(result) => console.log('Imported:', result)}
 *   onCancel={() => navigate('/members')}
 * />
 */
export function ImportWizard({
  onComplete,
  onCancel,
  siteId: initialSiteId,
  className = '',
}: ImportWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('source');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [result, setResult] = useState<MemberImportResult | null>(null);

  const [state, setState] = useState<WizardState>({
    file: null,
    parsedData: null,
    preview: null,
    mappings: [],
    columnConfig: [],
    duplicateStrategy: 'skip_all',
    matchFields: ['email'],
    siteId: initialSiteId || null,
    membershipLevelId: null,
    defaultTags: [],
    schedule: DEFAULT_SCHEDULE,
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  // Compute available fields for duplicate matching based on mappings
  // Only allow true identifiers - firstName/lastName are not unique
  const availableMatchFields = useMemo(() => {
    const VALID_IDENTIFIERS = ['email', 'phone', 'externalId'];
    return state.mappings
      .filter((m) => VALID_IDENTIFIERS.includes(m.targetField))
      .map((m) => ({
        value: m.targetField,
        label: m.targetField === 'externalId' ? 'External ID' :
               m.targetField === 'email' ? 'Email' :
               m.targetField === 'phone' ? 'Phone' : m.targetField,
      }));
  }, [state.mappings]);

  // Step navigation
  const goToStep = useCallback((step: WizardStep) => {
    setError(null);
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // When moving from mapping to cleaning, convert ColumnPreview to ColumnConfig
      if (currentStep === 'mapping' && state.preview) {
        const columnConfig = state.preview.columns.map((col) => {
          const mapping = state.mappings.find((m) => m.sourceColumn === col.name);
          return convertPreviewToConfig(col, mapping);
        });
        setState((prev) => ({ ...prev, columnConfig }));
      }
      goToStep(STEPS[nextIndex].id);
    }
  }, [currentStepIndex, currentStep, state.preview, state.mappings, goToStep]);

  const goBack = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      goToStep(STEPS[prevIndex].id);
    }
  }, [currentStepIndex, goToStep]);

  // Step 1: File upload
  const handleFileSelect = useCallback(async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      const parsed = await parseCSVFile(file);
      if (parsed.rows.length === 0) {
        throw new Error('No data rows found in file');
      }

      const preview = generatePreview(parsed);
      const suggestedMappings = suggestFieldMappings(parsed.headers);

      setState((prev) => ({
        ...prev,
        file,
        parsedData: parsed,
        preview,
        mappings: suggestedMappings,
      }));

      goNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  }, [goNext]);

  // Step 3: Update mappings
  const handleMappingsChange = useCallback((mappings: MemberImportMapping[]) => {
    setState((prev) => ({ ...prev, mappings }));
  }, []);

  // Step 4: Update column config (cleaning rules)
  const handleColumnConfigChange = useCallback((columnConfig: ExtendedColumnConfig[]) => {
    setState((prev) => ({ ...prev, columnConfig }));
  }, []);

  // Step 5: Update duplicate handling
  const handleMatchFieldsChange = useCallback((matchFields: string[]) => {
    setState((prev) => ({ ...prev, matchFields }));
  }, []);

  const handleStrategyChange = useCallback((duplicateStrategy: DuplicateStrategy) => {
    setState((prev) => ({ ...prev, duplicateStrategy }));
  }, []);

  // Step 6: Update site config
  const handleSiteChange = useCallback((siteId: string) => {
    setState((prev) => ({ ...prev, siteId }));
  }, []);

  const handleMembershipLevelChange = useCallback((membershipLevelId: string | null) => {
    setState((prev) => ({ ...prev, membershipLevelId }));
  }, []);

  const handleTagsChange = useCallback((defaultTags: string[]) => {
    setState((prev) => ({ ...prev, defaultTags }));
  }, []);

  // Step 7: Update schedule
  const handleScheduleChange = useCallback((schedule: ScheduleConfiguration) => {
    setState((prev) => ({ ...prev, schedule }));
  }, []);

  // Execute import
  const handleImport = useCallback(async () => {
    if (!state.parsedData || !state.siteId) {
      setError('Missing required data');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build cleaning rules map from column config
      const cleaningRulesMap: Record<string, string[]> = {};
      for (const col of state.columnConfig) {
        if (col.cleaning_rules.length > 0) {
          cleaningRulesMap[col.source_name] = col.cleaning_rules.map((r) => JSON.stringify(r));
        }
      }

      // Apply cleaning rules to mappings
      const mappingsWithRules: MemberImportMapping[] = state.mappings.map((m) => ({
        ...m,
        transformRules: cleaningRulesMap[m.sourceColumn] || [],
      }));

      // Map DuplicateStrategy to MemberImportConfig duplicateHandling
      const duplicateHandlingMap: Record<DuplicateStrategy, 'skip' | 'update' | 'create_new'> = {
        skip_all: 'skip',
        keep_first: 'skip',
        keep_last: 'update',
        keep_all: 'create_new',
      };

      const config: MemberImportConfig = {
        siteId: state.siteId!,
        defaultMembershipLevelId: state.membershipLevelId ?? undefined,
        defaultTags: state.defaultTags,
        defaultAcquisitionSource: 'import',
        duplicateHandling: duplicateHandlingMap[state.duplicateStrategy],
        matchFields: state.matchFields as ('email' | 'phone' | 'externalId')[],
      };

      // If schedule is recurring, save the data source for future syncs
      if (state.schedule.frequency !== 'manual') {
        await createMemberImportDataSource({
          name: `Member Import - ${state.file?.name || 'Unknown'}`,
          config: {
            filename: state.file?.name || 'unknown.csv',
            mappings: mappingsWithRules,
            columnConfig: state.columnConfig,
            importConfig: config,
          },
          scheduleConfig: state.schedule,
        });
      }

      // Run the immediate import
      const importResult = await importMembers(
        state.parsedData,
        mappingsWithRules,
        config,
        (p) => setProgress(p)
      );

      setResult(importResult);
      onComplete?.(importResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  }, [state, onComplete]);

  // Validate current step
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 'source':
        return !!state.file && !!state.parsedData;
      case 'preview':
        return !!state.preview && state.preview.totalRows > 0;
      case 'mapping':
        return state.mappings.some((m) => m.targetField !== 'skip');
      case 'cleaning':
        return true; // Cleaning rules are optional
      case 'preview_cleaning':
        return true; // Preview is informational
      case 'duplicates':
        return state.matchFields.length > 0 || state.duplicateStrategy === 'keep_all';
      case 'site':
        return !!state.siteId;
      case 'schedule':
        return true;
      default:
        return false;
    }
  }, [currentStep, state]);

  // Render step progress indicator
  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = step.id === currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <button
              type="button"
              onClick={() => index <= currentStepIndex && goToStep(step.id)}
              disabled={index > currentStepIndex}
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                isCompleted
                  ? 'bg-[#2e7d32] text-white cursor-pointer'
                  : isCurrent
                    ? 'bg-[#0353a4] text-white'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed',
              ].join(' ')}
              title={step.title}
            >
              {isCompleted ? <CheckIcon /> : index + 1}
            </button>
            {index < STEPS.length - 1 && (
              <div
                className={[
                  'w-12 h-1 mx-1',
                  index < currentStepIndex ? 'bg-[#2e7d32]' : 'bg-gray-200',
                ].join(' ')}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    if (result) {
      // Show result summary
      return (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#2e7d32]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckIcon />
          </div>
          <h2 className="text-2xl font-bold text-[#003559] mb-2">Import Complete</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-lg mx-auto mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-[#003559]">{result.totalRows}</div>
              <div className="text-sm text-gray-500">Total Rows</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#2e7d32]">{result.imported}</div>
              <div className="text-sm text-gray-500">Imported</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#0353a4]">{result.updated}</div>
              <div className="text-sm text-gray-500">Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-[#ed6c02]">{result.skipped}</div>
              <div className="text-sm text-gray-500">Skipped</div>
            </div>
          </div>
          {result.failed > 0 && (
            <div className="mt-4">
              <Badge variant="danger">{result.failed} Failed</Badge>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className="mt-4 text-left max-h-48 overflow-y-auto bg-[#f5f5f5] rounded-lg p-4">
              <div className="text-sm font-medium text-[#003559] mb-2">Errors:</div>
              {result.errors.slice(0, 20).map((err, i) => (
                <div key={i} className="text-sm text-gray-600">
                  Row {err.row}: {err.message}
                </div>
              ))}
              {result.errors.length > 20 && (
                <div className="text-sm text-gray-500 mt-2">
                  ... and {result.errors.length - 20} more
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    switch (currentStep) {
      case 'source':
        return (
          <SourceSelection
            onFileSelect={handleFileSelect}
            loading={loading}
          />
        );
      case 'preview':
        return state.preview ? (
          <DataPreview preview={state.preview} />
        ) : null;
      case 'mapping':
        return state.preview ? (
          <ColumnMapping
            columns={state.preview.columns}
            mappings={state.mappings}
            onChange={handleMappingsChange}
          />
        ) : null;
      case 'cleaning':
        return (
          <CleaningRulesStep
            columns={state.columnConfig}
            onChange={handleColumnConfigChange}
          />
        );
      case 'preview_cleaning':
        if (!state.parsedData) return null;
        // Convert string[][] rows to Record<string, unknown>[] using headers
        const sampleRowObjects = state.parsedData.rows.slice(0, 10).map((row) => {
          const obj: Record<string, unknown> = {};
          state.parsedData!.headers.forEach((header, idx) => {
            obj[header] = row[idx];
          });
          return obj;
        });
        return (
          <CleaningPreview
            sampleRows={sampleRowObjects}
            columns={state.columnConfig}
          />
        );
      case 'duplicates':
        return (
          <DuplicateHandling
            matchFields={state.matchFields}
            availableFields={availableMatchFields}
            strategy={state.duplicateStrategy}
            onMatchFieldsChange={handleMatchFieldsChange}
            onStrategyChange={handleStrategyChange}
          />
        );
      case 'site':
        return (
          <SiteAssignment
            siteId={state.siteId}
            membershipLevelId={state.membershipLevelId}
            defaultTags={state.defaultTags}
            onSiteChange={handleSiteChange}
            onMembershipLevelChange={handleMembershipLevelChange}
            onTagsChange={handleTagsChange}
          />
        );
      case 'schedule':
        return (
          <ScheduleConfig
            schedule={state.schedule}
            onChange={handleScheduleChange}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Card className={className} padding="none">
      <CardHeader
        actions={
          onCancel && !result && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )
        }
      >
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold">Import Members</span>
          {currentStep !== 'source' && !result && (
            <Badge variant="secondary" size="sm">
              Step {currentStepIndex + 1} of {STEPS.length}: {STEPS[currentStepIndex].title}
            </Badge>
          )}
        </div>
      </CardHeader>

      <div className="p-6">
        {!result && renderStepIndicator()}

        {error && (
          <div className="mb-6 p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f]">
            {error}
          </div>
        )}

        {progress && !result && (
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">
                Processing... {progress.processed} of {progress.total}
              </span>
              <span className="text-[#003559] font-medium">
                {Math.round((progress.processed / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0353a4] transition-all duration-300"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {renderStepContent()}
      </div>

      {!result && (
        <CardFooter>
          {currentStepIndex > 0 && (
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={loading}
              leftIcon={<ArrowLeftIcon />}
            >
              Back
            </Button>
          )}
          <div className="flex-1" />
          {currentStep === 'schedule' ? (
            <Button
              onClick={handleImport}
              loading={loading}
              disabled={!canProceed()}
            >
              Start Import
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={!canProceed() || loading}
              rightIcon={<ArrowRightIcon />}
            >
              Continue
            </Button>
          )}
        </CardFooter>
      )}

      {result && (
        <CardFooter>
          <Button variant="ghost" onClick={onCancel}>
            Close
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

export default ImportWizard;
