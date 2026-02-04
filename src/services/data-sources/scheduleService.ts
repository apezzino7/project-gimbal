/**
 * Schedule Service
 *
 * Manages sync schedules for data sources.
 * Calculates next sync times based on schedule configuration.
 */

import type { ScheduleConfiguration, SyncScheduleFrequency } from '../../types/dataImport';

// =============================================================================
// Next Sync Calculation
// =============================================================================

/**
 * Calculate the next sync time based on schedule configuration
 */
export function calculateNextSyncTime(
  config: ScheduleConfiguration,
  fromTime: Date = new Date()
): Date | null {
  if (config.frequency === 'manual') {
    return null;
  }

  // Get the timezone offset if specified
  const timezone = config.timezone ?? 'UTC';
  const now = fromTime;

  switch (config.frequency) {
    case 'hourly':
      return getNextHour(now);

    case 'daily':
      return getNextDaily(now, config.time ?? '02:00', timezone);

    case 'weekly':
      return getNextWeekly(
        now,
        config.day_of_week ?? 0,
        config.time ?? '02:00',
        timezone
      );

    case 'monthly':
      return getNextMonthly(
        now,
        config.day_of_month ?? 1,
        config.time ?? '02:00',
        timezone
      );

    case 'cron':
      return config.cron_expression
        ? parseCronExpression(config.cron_expression, now)
        : null;

    default:
      return null;
  }
}

/**
 * Get the next hour mark (xx:00:00)
 */
function getNextHour(from: Date): Date {
  const next = new Date(from);
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}

/**
 * Get the next daily sync time
 */
function getNextDaily(from: Date, time: string, timezone: string): Date {
  const [hours, minutes] = time.split(':').map(Number);

  // Create date in target timezone
  const next = new Date(from);
  setTimeInTimezone(next, hours, minutes, timezone);

  // If the time has passed today, schedule for tomorrow
  if (next <= from) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

/**
 * Get the next weekly sync time
 */
function getNextWeekly(
  from: Date,
  dayOfWeek: number,
  time: string,
  timezone: string
): Date {
  const [hours, minutes] = time.split(':').map(Number);

  const next = new Date(from);
  setTimeInTimezone(next, hours, minutes, timezone);

  // Calculate days until target day of week
  const currentDay = next.getDay();
  let daysUntil = dayOfWeek - currentDay;

  if (daysUntil < 0 || (daysUntil === 0 && next <= from)) {
    daysUntil += 7;
  }

  next.setDate(next.getDate() + daysUntil);

  return next;
}

/**
 * Get the next monthly sync time
 */
function getNextMonthly(
  from: Date,
  dayOfMonth: number,
  time: string,
  timezone: string
): Date {
  const [hours, minutes] = time.split(':').map(Number);

  const next = new Date(from);
  setTimeInTimezone(next, hours, minutes, timezone);

  // Set to target day of month
  next.setDate(dayOfMonth);

  // If the date has passed this month, schedule for next month
  if (next <= from) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(dayOfMonth);
  }

  // Handle months with fewer days
  const targetMonth = next.getMonth();
  if (next.getMonth() !== targetMonth) {
    // Rolled over to next month, set to last day of intended month
    next.setDate(0);
  }

  return next;
}

/**
 * Set time in a specific timezone (simplified implementation)
 * For production, use a proper timezone library like date-fns-tz or luxon
 */
function setTimeInTimezone(date: Date, hours: number, minutes: number, _timezone: string): void {
  // TODO: Implement proper timezone handling with date-fns-tz
  // For now, just set local time (timezone param reserved for future use)
  date.setHours(hours, minutes, 0, 0);
}

// =============================================================================
// Cron Parsing (Simplified)
// =============================================================================

/**
 * Parse a cron expression and get the next run time
 * Supports standard 5-field cron: minute hour day month weekday
 *
 * This is a simplified implementation. For production, use a library like cron-parser.
 */
function parseCronExpression(expression: string, from: Date): Date | null {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    console.warn('Invalid cron expression:', expression);
    return null;
  }

  const [minuteExpr, hourExpr, dayExpr, monthExpr, weekdayExpr] = parts;

  // Start from the next minute
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Try to find a matching time within the next year
  const maxIterations = 365 * 24 * 60; // One year of minutes

  for (let i = 0; i < maxIterations; i++) {
    if (
      matchesCronField(next.getMinutes(), minuteExpr, 0, 59) &&
      matchesCronField(next.getHours(), hourExpr, 0, 23) &&
      matchesCronField(next.getDate(), dayExpr, 1, 31) &&
      matchesCronField(next.getMonth() + 1, monthExpr, 1, 12) &&
      matchesCronField(next.getDay(), weekdayExpr, 0, 6)
    ) {
      return next;
    }

    next.setMinutes(next.getMinutes() + 1);
  }

  return null;
}

/**
 * Check if a value matches a cron field expression
 */
function matchesCronField(value: number, expr: string, _min: number, _max: number): boolean {
  // Wildcard
  if (expr === '*') {
    return true;
  }

  // Specific value
  const numValue = parseInt(expr, 10);
  if (!isNaN(numValue)) {
    return value === numValue;
  }

  // Range (e.g., "1-5")
  if (expr.includes('-')) {
    const [start, end] = expr.split('-').map(Number);
    return value >= start && value <= end;
  }

  // List (e.g., "1,3,5")
  if (expr.includes(',')) {
    const values = expr.split(',').map(Number);
    return values.includes(value);
  }

  // Step (e.g., "*/5")
  if (expr.includes('/')) {
    const [, step] = expr.split('/');
    const stepValue = parseInt(step, 10);
    return value % stepValue === 0;
  }

  return false;
}

// =============================================================================
// Schedule Validation
// =============================================================================

/**
 * Validate a schedule configuration
 */
export function validateScheduleConfig(config: ScheduleConfiguration): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.frequency === 'cron' && !config.cron_expression) {
    errors.push('Cron expression is required for cron frequency');
  }

  if (config.time && !/^\d{2}:\d{2}$/.test(config.time)) {
    errors.push('Time must be in HH:MM format');
  }

  if (config.day_of_week !== undefined && (config.day_of_week < 0 || config.day_of_week > 6)) {
    errors.push('Day of week must be between 0 (Sunday) and 6 (Saturday)');
  }

  if (config.day_of_month !== undefined && (config.day_of_month < 1 || config.day_of_month > 28)) {
    errors.push('Day of month must be between 1 and 28');
  }

  if (config.max_retries !== undefined && (config.max_retries < 0 || config.max_retries > 10)) {
    errors.push('Max retries must be between 0 and 10');
  }

  if (config.retry_delay_minutes !== undefined && (config.retry_delay_minutes < 1 || config.retry_delay_minutes > 1440)) {
    errors.push('Retry delay must be between 1 and 1440 minutes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// Schedule Display
// =============================================================================

/**
 * Get a human-readable description of a schedule
 */
export function getScheduleDescription(config: ScheduleConfiguration): string {
  switch (config.frequency) {
    case 'manual':
      return 'Manual sync only';

    case 'hourly':
      return 'Every hour';

    case 'daily':
      return `Daily at ${config.time ?? '02:00'}${config.timezone ? ` (${config.timezone})` : ''}`;

    case 'weekly': {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const day = days[config.day_of_week ?? 0];
      return `Every ${day} at ${config.time ?? '02:00'}${config.timezone ? ` (${config.timezone})` : ''}`;
    }

    case 'monthly':
      return `Monthly on day ${config.day_of_month ?? 1} at ${config.time ?? '02:00'}${config.timezone ? ` (${config.timezone})` : ''}`;

    case 'cron':
      return `Custom: ${config.cron_expression}`;

    default:
      return 'Unknown schedule';
  }
}

/**
 * Get the frequency options for UI display
 */
export function getFrequencyOptions(): Array<{
  value: SyncScheduleFrequency;
  label: string;
  description: string;
}> {
  return [
    {
      value: 'manual',
      label: 'Manual',
      description: 'Sync only when triggered manually',
    },
    {
      value: 'hourly',
      label: 'Hourly',
      description: 'Sync every hour at :00',
    },
    {
      value: 'daily',
      label: 'Daily',
      description: 'Sync once per day at specified time',
    },
    {
      value: 'weekly',
      label: 'Weekly',
      description: 'Sync once per week on specified day',
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'Sync once per month on specified day',
    },
    {
      value: 'cron',
      label: 'Custom Cron',
      description: 'Define a custom cron expression',
    },
  ];
}

// =============================================================================
// Retry Logic
// =============================================================================

/**
 * Calculate delay for retry attempt with exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  baseDelayMinutes: number
): number {
  // Exponential backoff: base * 2^attempt
  // e.g., with base 15: 15, 30, 60, 120, 240 minutes
  return baseDelayMinutes * Math.pow(2, attemptNumber - 1);
}

/**
 * Calculate next retry time
 */
export function calculateNextRetryTime(
  attemptNumber: number,
  config: ScheduleConfiguration,
  fromTime: Date = new Date()
): Date {
  const delayMinutes = calculateRetryDelay(
    attemptNumber,
    config.retry_delay_minutes ?? 15
  );

  const nextRetry = new Date(fromTime);
  nextRetry.setMinutes(nextRetry.getMinutes() + delayMinutes);

  return nextRetry;
}

/**
 * Check if more retries should be attempted
 */
export function shouldRetry(
  attemptNumber: number,
  config: ScheduleConfiguration
): boolean {
  if (!config.retry_on_failure) {
    return false;
  }

  const maxRetries = config.max_retries ?? 3;
  return attemptNumber < maxRetries;
}

// =============================================================================
// Common Timezone List
// =============================================================================

/**
 * Get list of common timezones for UI dropdown
 */
export function getCommonTimezones(): Array<{ value: string; label: string }> {
  return [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Central European Time (CET)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)' },
    { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
    { value: 'Asia/Shanghai', label: 'China Standard Time (CST)' },
    { value: 'Asia/Kolkata', label: 'India Standard Time (IST)' },
    { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' },
    { value: 'Pacific/Auckland', label: 'New Zealand Time (NZT)' },
  ];
}

// =============================================================================
// Export Service
// =============================================================================

export const scheduleService = {
  calculateNextSyncTime,
  validateScheduleConfig,
  getScheduleDescription,
  getFrequencyOptions,
  calculateRetryDelay,
  calculateNextRetryTime,
  shouldRetry,
  getCommonTimezones,
};

export default scheduleService;
