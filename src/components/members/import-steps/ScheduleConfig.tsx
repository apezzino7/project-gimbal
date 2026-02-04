import type { ScheduleConfiguration } from '@/types/dataImport';
import { Badge } from '../../common/Badge';
import { Select } from '../../common/Select';
import { Input } from '../../common/Input';

// =============================================================================
// Types
// =============================================================================

export interface ScheduleConfigProps {
  /** Current schedule configuration */
  schedule: ScheduleConfiguration;
  /** Called when schedule changes */
  onChange: (schedule: ScheduleConfiguration) => void;
}

interface FrequencyOption {
  value: ScheduleConfiguration['frequency'];
  label: string;
  description: string;
}

// =============================================================================
// Constants
// =============================================================================

const FREQUENCIES: FrequencyOption[] = [
  {
    value: 'manual',
    label: 'One-time Import',
    description: 'Import data once, no automatic syncing',
  },
  {
    value: 'daily',
    label: 'Daily',
    description: 'Sync changes every day at a specified time',
  },
  {
    value: 'weekly',
    label: 'Weekly',
    description: 'Sync changes once per week',
  },
  {
    value: 'monthly',
    label: 'Monthly',
    description: 'Sync changes once per month',
  },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'UTC' },
];

// =============================================================================
// Icons
// =============================================================================

function ClockIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 7: Schedule configuration - one-time or recurring sync.
 */
export function ScheduleConfig({ schedule, onChange }: ScheduleConfigProps) {
  const updateSchedule = (updates: Partial<ScheduleConfiguration>) => {
    onChange({ ...schedule, ...updates });
  };

  const isRecurring = schedule.frequency !== 'manual';

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Import Schedule</h2>
        <p className="text-gray-500 text-sm">
          Choose whether to import once or set up recurring syncs.
        </p>
      </div>

      {/* Frequency selection */}
      <div>
        <div className="text-sm font-medium text-[#003559] mb-3">Import Frequency</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {FREQUENCIES.map((freq) => {
            const isSelected = schedule.frequency === freq.value;
            const isOneTime = freq.value === 'manual';

            return (
              <button
                key={freq.value}
                type="button"
                onClick={() => updateSchedule({ frequency: freq.value })}
                className={[
                  'flex items-start gap-3 p-4 rounded-lg border text-left transition-colors',
                  isSelected
                    ? 'border-[#0353a4] bg-[#b9d6f2]/10'
                    : 'border-[#e0e0e0] bg-white hover:border-[#0353a4]',
                ].join(' ')}
              >
                <div className={[
                  'shrink-0 p-2 rounded-lg',
                  isSelected ? 'bg-[#0353a4] text-white' : 'bg-[#f5f5f5] text-gray-500',
                ].join(' ')}>
                  {isOneTime ? <ClockIcon /> : <RefreshIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={['font-medium', isSelected ? 'text-[#003559]' : 'text-gray-700'].join(' ')}>
                      {freq.label}
                    </span>
                    {isOneTime && <Badge variant="success" size="sm">Recommended</Badge>}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{freq.description}</p>
                </div>
                <div className={[
                  'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSelected ? 'border-[#0353a4]' : 'border-[#e0e0e0]',
                ].join(' ')}>
                  {isSelected && <div className="w-3 h-3 rounded-full bg-[#0353a4]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Schedule details (for recurring) */}
      {isRecurring && (
        <div className="border border-[#e0e0e0] rounded-lg p-4 space-y-4">
          <div className="text-sm font-medium text-[#003559]">Schedule Details</div>

          {/* Time */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Time</label>
              <Input
                type="time"
                value={schedule.time || '00:00'}
                onChange={(e) => updateSchedule({ time: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Timezone</label>
              <Select
                value={schedule.timezone || 'America/New_York'}
                onChange={(e) => updateSchedule({ timezone: e.target.value })}
                options={TIMEZONES}
              />
            </div>
          </div>

          {/* Day of week (weekly) */}
          {schedule.frequency === 'weekly' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Day of Week</label>
              <Select
                value={String(schedule.day_of_week ?? 1)}
                onChange={(e) => updateSchedule({ day_of_week: Number(e.target.value) })}
                options={DAYS_OF_WEEK}
              />
            </div>
          )}

          {/* Day of month (monthly) */}
          {schedule.frequency === 'monthly' && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">Day of Month</label>
              <Select
                value={String(schedule.day_of_month ?? 1)}
                onChange={(e) => updateSchedule({ day_of_month: Number(e.target.value) })}
                options={Array.from({ length: 28 }, (_, i) => ({
                  value: String(i + 1),
                  label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
                }))}
              />
              <p className="text-xs text-gray-500 mt-1">
                Days 29-31 are not available to ensure the sync runs every month.
              </p>
            </div>
          )}

          {/* Retry settings */}
          <div className="pt-3 border-t border-[#e0e0e0]">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={schedule.retry_on_failure}
                onChange={(e) => updateSchedule({ retry_on_failure: e.target.checked })}
                className="w-4 h-4 rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
              />
              <span className="text-sm text-gray-700">Retry on failure</span>
            </label>

            {schedule.retry_on_failure && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2 pl-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Retries</label>
                  <Select
                    value={String(schedule.max_retries ?? 3)}
                    onChange={(e) => updateSchedule({ max_retries: Number(e.target.value) })}
                    options={[
                      { value: '1', label: '1' },
                      { value: '2', label: '2' },
                      { value: '3', label: '3' },
                      { value: '5', label: '5' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Retry Delay</label>
                  <Select
                    value={String(schedule.retry_delay_minutes ?? 5)}
                    onChange={(e) => updateSchedule({ retry_delay_minutes: Number(e.target.value) })}
                    options={[
                      { value: '1', label: '1 minute' },
                      { value: '5', label: '5 minutes' },
                      { value: '15', label: '15 minutes' },
                      { value: '30', label: '30 minutes' },
                      { value: '60', label: '1 hour' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Differential sync info */}
      {isRecurring && (
        <div className="bg-[#b9d6f2]/20 border border-[#b9d6f2] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 text-[#0353a4]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-[#003559]">Differential Sync</div>
              <p className="text-sm text-gray-600 mt-1">
                After the initial import, recurring syncs will only import new or modified records
                based on the <code className="bg-white px-1 rounded">updated_at</code> column in your data source.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-[#f5f5f5] rounded-lg p-4">
        <div className="text-sm font-medium text-[#003559] mb-2">Schedule Summary</div>
        <p className="text-sm text-gray-600">
          {schedule.frequency === 'manual' ? (
            'This import will run once when you click "Start Import".'
          ) : schedule.frequency === 'daily' ? (
            `Import will run daily at ${schedule.time || '12:00 AM'} ${getTimezoneLabel(schedule.timezone)}.`
          ) : schedule.frequency === 'weekly' ? (
            `Import will run every ${DAYS_OF_WEEK.find((d) => d.value === String(schedule.day_of_week))?.label || 'Monday'} at ${schedule.time || '12:00 AM'} ${getTimezoneLabel(schedule.timezone)}.`
          ) : (
            `Import will run on the ${schedule.day_of_month || 1}${getOrdinalSuffix(schedule.day_of_month || 1)} of each month at ${schedule.time || '12:00 AM'} ${getTimezoneLabel(schedule.timezone)}.`
          )}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

function getOrdinalSuffix(n: number): string {
  if (n > 3 && n < 21) return 'th';
  switch (n % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

function getTimezoneLabel(tz?: string): string {
  const found = TIMEZONES.find((t) => t.value === tz);
  return found ? found.label : 'ET';
}

export default ScheduleConfig;
