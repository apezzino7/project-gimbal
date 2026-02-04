import type { ReactNode } from 'react';
import { Card } from '../common/Card';

// =============================================================================
// Types
// =============================================================================

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface MetricCardProps {
  /** Metric label/title */
  label: string;
  /** Current value (formatted) */
  value: string | number;
  /** Previous period value for comparison */
  previousValue?: string | number;
  /** Trend percentage change */
  trend?: number;
  /** Force trend direction (auto-detected from trend if not provided) */
  trendDirection?: TrendDirection;
  /** Whether positive trend is good (default: true) */
  positiveIsGood?: boolean;
  /** Icon to display */
  icon?: ReactNode;
  /** Description or subtitle */
  description?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getTrendDirection(trend: number): TrendDirection {
  if (trend > 0) return 'up';
  if (trend < 0) return 'down';
  return 'neutral';
}

function getTrendColor(direction: TrendDirection, positiveIsGood: boolean): string {
  if (direction === 'neutral') return 'text-gray-500';
  const isGood = direction === 'up' ? positiveIsGood : !positiveIsGood;
  return isGood ? 'text-[#2e7d32]' : 'text-[#d32f2f]';
}

function getTrendBgColor(direction: TrendDirection, positiveIsGood: boolean): string {
  if (direction === 'neutral') return 'bg-gray-100';
  const isGood = direction === 'up' ? positiveIsGood : !positiveIsGood;
  return isGood ? 'bg-[#2e7d32]/10' : 'bg-[#d32f2f]/10';
}

// =============================================================================
// Component
// =============================================================================

/**
 * MetricCard for displaying KPIs with trend indicators.
 *
 * @example
 * <MetricCard
 *   label="Total Revenue"
 *   value="$12,345"
 *   trend={12.5}
 *   icon={<DollarIcon />}
 * />
 *
 * @example
 * // Negative trend where down is good (e.g., bounce rate)
 * <MetricCard
 *   label="Bounce Rate"
 *   value="23%"
 *   trend={-5.2}
 *   positiveIsGood={false}
 * />
 */
export function MetricCard({
  label,
  value,
  previousValue,
  trend,
  trendDirection: forcedDirection,
  positiveIsGood = true,
  icon,
  description,
  loading = false,
  className = '',
}: MetricCardProps) {
  const direction = forcedDirection ?? (trend !== undefined ? getTrendDirection(trend) : 'neutral');
  const trendColor = getTrendColor(direction, positiveIsGood);
  const trendBgColor = getTrendBgColor(direction, positiveIsGood);

  if (loading) {
    return (
      <Card className={className} padding="md">
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-gray-200 rounded mb-3" />
          <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="md">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>

          {/* Value */}
          <p className="mt-1 text-2xl font-bold text-[#003559] truncate">{value}</p>

          {/* Trend */}
          {trend !== undefined && (
            <div className="mt-2 flex items-center gap-2">
              <span
                className={[
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                  trendColor,
                  trendBgColor,
                ].join(' ')}
              >
                {direction === 'up' && (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                  </svg>
                )}
                {direction === 'down' && (
                  <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
                  </svg>
                )}
                {Math.abs(trend).toFixed(1)}%
              </span>
              {previousValue !== undefined && (
                <span className="text-xs text-gray-500">vs {previousValue}</span>
              )}
            </div>
          )}

          {/* Description */}
          {description && !trend && (
            <p className="mt-2 text-sm text-gray-500">{description}</p>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div className="shrink-0 p-3 bg-[#b9d6f2]/30 rounded-lg text-[#0353a4]">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

export default MetricCard;
