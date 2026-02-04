import type { HTMLAttributes } from 'react';

// =============================================================================
// Types
// =============================================================================

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Size variant */
  size?: SpinnerSize;
  /** Color - defaults to current text color */
  color?: string;
  /** Accessible label */
  label?: string;
}

// =============================================================================
// Styles
// =============================================================================

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Spinner component for loading states.
 *
 * @example
 * // Basic usage
 * <Spinner />
 *
 * @example
 * // Different sizes
 * <Spinner size="sm" />
 * <Spinner size="lg" />
 *
 * @example
 * // With custom color
 * <Spinner color="#0353a4" />
 *
 * @example
 * // With accessible label
 * <Spinner label="Loading data..." />
 */
export function Spinner({
  size = 'md',
  color,
  label = 'Loading',
  className = '',
  ...props
}: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={['inline-flex', className].filter(Boolean).join(' ')}
      {...props}
    >
      <svg
        className={['animate-spin', sizeStyles[size]].join(' ')}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        style={color ? { color } : undefined}
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Full page loading spinner overlay.
 */
export function LoadingOverlay({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" color="#0353a4" label={label} />
        <p className="text-sm font-medium text-[#003559]">{label}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading state for content areas.
 */
export function LoadingContent({
  label = 'Loading...',
  className = '',
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 py-12',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Spinner size="lg" color="#0353a4" label={label} />
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

export default Spinner;
