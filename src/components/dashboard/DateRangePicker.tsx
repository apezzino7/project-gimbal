import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '../common/Button';

// =============================================================================
// Types
// =============================================================================

export type DateRangePreset = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'mtd' | 'ytd' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DateRangePickerProps {
  /** Current date range */
  value: DateRange;
  /** Called when date range changes */
  onChange: (range: DateRange) => void;
  /** Available presets */
  presets?: DateRangePreset[];
  /** Minimum selectable date */
  minDate?: Date;
  /** Maximum selectable date */
  maxDate?: Date;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Preset Definitions
// =============================================================================

interface PresetOption {
  label: string;
  getRange: () => DateRange;
}

const PRESET_OPTIONS: Record<DateRangePreset, PresetOption> = {
  today: {
    label: 'Today',
    getRange: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { start: today, end };
    },
  },
  yesterday: {
    label: 'Yesterday',
    getRange: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const end = new Date(yesterday);
      end.setHours(23, 59, 59, 999);
      return { start: yesterday, end };
    },
  },
  '7d': {
    label: 'Last 7 Days',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  '30d': {
    label: 'Last 30 Days',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  '90d': {
    label: 'Last 90 Days',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 89);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  mtd: {
    label: 'Month to Date',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getFullYear(), end.getMonth(), 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  ytd: {
    label: 'Year to Date',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date(end.getFullYear(), 0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
  custom: {
    label: 'Custom',
    getRange: () => {
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    },
  },
};

const DEFAULT_PRESETS: DateRangePreset[] = ['7d', '30d', '90d', 'mtd', 'ytd'];

// =============================================================================
// Helpers
// =============================================================================

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

function detectPreset(range: DateRange, presets: DateRangePreset[]): DateRangePreset | null {
  for (const preset of presets) {
    if (preset === 'custom') continue;
    const presetRange = PRESET_OPTIONS[preset].getRange();
    if (
      range.start.toDateString() === presetRange.start.toDateString() &&
      range.end.toDateString() === presetRange.end.toDateString()
    ) {
      return preset;
    }
  }
  return null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * DateRangePicker with presets and custom date selection.
 *
 * @example
 * const [dateRange, setDateRange] = useState({
 *   start: subDays(new Date(), 7),
 *   end: new Date(),
 * });
 *
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 *   presets={['7d', '30d', '90d', 'custom']}
 * />
 */
export function DateRangePicker({
  value,
  onChange,
  presets = DEFAULT_PRESETS,
  minDate,
  maxDate,
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(formatDateInput(value.start));
  const [tempEnd, setTempEnd] = useState(formatDateInput(value.end));
  const containerRef = useRef<HTMLDivElement>(null);

  const activePreset = detectPreset(value, presets);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = useCallback((preset: DateRangePreset) => {
    if (preset === 'custom') {
      setIsOpen(true);
    } else {
      onChange(PRESET_OPTIONS[preset].getRange());
      setIsOpen(false);
    }
  }, [onChange]);

  const handleCustomApply = useCallback(() => {
    const start = new Date(tempStart);
    const end = new Date(tempEnd);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    onChange({ start, end });
    setIsOpen(false);
  }, [tempStart, tempEnd, onChange]);

  return (
    <div className={['relative inline-block', className].join(' ')} ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'inline-flex items-center gap-2 px-4 py-2 rounded-lg border',
          'bg-white text-[#003559] text-sm font-medium',
          'border-[#e0e0e0] hover:border-[#0353a4]',
          'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:ring-offset-2',
          'transition-colors',
        ].join(' ')}
      >
        <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 01.75.75V4h7V2.75a.75.75 0 011.5 0V4h.25A2.75 2.75 0 0118 6.75v8.5A2.75 2.75 0 0115.25 18H4.75A2.75 2.75 0 012 15.25v-8.5A2.75 2.75 0 014.75 4H5V2.75A.75.75 0 015.75 2zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75z" clipRule="evenodd" />
        </svg>
        <span>{formatDate(value.start)} - {formatDate(value.end)}</span>
        <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={[
            'absolute right-0 top-full mt-2 z-50',
            'bg-white rounded-xl border border-[#e0e0e0] shadow-lg',
            'min-w-[280px]',
          ].join(' ')}
        >
          {/* Presets */}
          <div className="p-3 border-b border-[#e0e0e0]">
            <div className="flex flex-wrap gap-2">
              {presets.filter(p => p !== 'custom').map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className={[
                    'px-3 py-1.5 text-sm rounded-lg transition-colors',
                    activePreset === preset
                      ? 'bg-[#0353a4] text-white'
                      : 'bg-[#f5f5f5] text-[#003559] hover:bg-[#b9d6f2]/30',
                  ].join(' ')}
                >
                  {PRESET_OPTIONS[preset].label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom date inputs */}
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={tempStart}
                  onChange={(e) => setTempStart(e.target.value)}
                  min={minDate ? formatDateInput(minDate) : undefined}
                  max={tempEnd}
                  className={[
                    'w-full px-3 py-2 text-sm rounded-lg border border-[#e0e0e0]',
                    'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4]',
                  ].join(' ')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={tempEnd}
                  onChange={(e) => setTempEnd(e.target.value)}
                  min={tempStart}
                  max={maxDate ? formatDateInput(maxDate) : formatDateInput(new Date())}
                  className={[
                    'w-full px-3 py-2 text-sm rounded-lg border border-[#e0e0e0]',
                    'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4]',
                  ].join(' ')}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleCustomApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DateRangePicker;
