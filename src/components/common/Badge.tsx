import type { HTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Badge content */
  children: ReactNode;
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Size variant */
  size?: BadgeSize;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Makes badge rounded (pill style) */
  rounded?: boolean;
  /** Adds dot indicator before text */
  dot?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = 'inline-flex items-center gap-1.5 font-medium';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-[#b9d6f2] text-[#003559]',
  secondary: 'bg-[#006daa]/10 text-[#006daa]',
  success: 'bg-[#2e7d32]/10 text-[#2e7d32]',
  warning: 'bg-[#ed6c02]/10 text-[#ed6c02]',
  danger: 'bg-[#d32f2f]/10 text-[#d32f2f]',
  info: 'bg-[#0288d1]/10 text-[#0288d1]',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  primary: 'bg-[#0353a4]',
  secondary: 'bg-[#006daa]',
  success: 'bg-[#2e7d32]',
  warning: 'bg-[#ed6c02]',
  danger: 'bg-[#d32f2f]',
  info: 'bg-[#0288d1]',
};

const sizeStyles: Record<BadgeSize, { badge: string; dot: string }> = {
  sm: { badge: 'px-2 py-0.5 text-xs', dot: 'h-1.5 w-1.5' },
  md: { badge: 'px-2.5 py-1 text-sm', dot: 'h-2 w-2' },
  lg: { badge: 'px-3 py-1.5 text-base', dot: 'h-2.5 w-2.5' },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Badge component for status indicators, labels, and tags.
 *
 * @example
 * // Basic usage
 * <Badge>Default</Badge>
 *
 * @example
 * // Status badges
 * <Badge variant="success">Active</Badge>
 * <Badge variant="warning">Pending</Badge>
 * <Badge variant="danger">Failed</Badge>
 *
 * @example
 * // With dot indicator
 * <Badge variant="success" dot>Online</Badge>
 *
 * @example
 * // Pill style
 * <Badge rounded>Tag</Badge>
 */
export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  rounded = false,
  dot = false,
  className = '',
  ...props
}: BadgeProps) {
  const styles = sizeStyles[size];

  return (
    <span
      className={[
        baseStyles,
        variantStyles[variant],
        styles.badge,
        rounded ? 'rounded-full' : 'rounded-md',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {dot && (
        <span
          className={['rounded-full shrink-0', dotColors[variant], styles.dot].join(' ')}
          aria-hidden="true"
        />
      )}
      {!dot && icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

export default Badge;
