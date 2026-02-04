import type { HTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  /** Alert content */
  children: ReactNode;
  /** Visual style variant */
  variant?: AlertVariant;
  /** Optional title */
  title?: string;
  /** Optional icon (defaults based on variant) */
  icon?: ReactNode;
  /** Whether alert can be dismissed */
  dismissible?: boolean;
  /** Called when dismiss button is clicked */
  onDismiss?: () => void;
}

// =============================================================================
// Styles
// =============================================================================

const variantStyles: Record<AlertVariant, { container: string; icon: string }> = {
  info: {
    container: 'bg-[#b9d6f2]/30 border-[#0353a4]/30 text-[#003559]',
    icon: 'text-[#0353a4]',
  },
  success: {
    container: 'bg-[#2e7d32]/10 border-[#2e7d32]/30 text-[#1b5e20]',
    icon: 'text-[#2e7d32]',
  },
  warning: {
    container: 'bg-[#ed6c02]/10 border-[#ed6c02]/30 text-[#c55a00]',
    icon: 'text-[#ed6c02]',
  },
  danger: {
    container: 'bg-[#d32f2f]/10 border-[#d32f2f]/30 text-[#b71c1c]',
    icon: 'text-[#d32f2f]',
  },
};

// =============================================================================
// Icons
// =============================================================================

const variantIcons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  danger: (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

// =============================================================================
// Component
// =============================================================================

/**
 * Alert component for displaying important messages.
 *
 * @example
 * // Basic usage
 * <Alert variant="info">This is an informational message.</Alert>
 *
 * @example
 * // With title
 * <Alert variant="success" title="Success!">Your changes have been saved.</Alert>
 *
 * @example
 * // Dismissible
 * <Alert variant="warning" dismissible onDismiss={handleDismiss}>
 *   Your session will expire in 5 minutes.
 * </Alert>
 *
 * @example
 * // Error alert
 * <Alert variant="danger" title="Error">
 *   Failed to save changes. Please try again.
 * </Alert>
 */
export function Alert({
  children,
  variant = 'info',
  title,
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  role = 'alert',
  ...props
}: AlertProps) {
  const styles = variantStyles[variant];
  const defaultIcon = variantIcons[variant];

  return (
    <div
      role={role}
      className={[
        'rounded-lg border p-4',
        styles.container,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={['shrink-0', styles.icon].join(' ')}>
          {icon || defaultIcon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold mb-1">{title}</h3>
          )}
          <div className={title ? 'text-sm opacity-90' : ''}>{children}</div>
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={[
              'shrink-0 p-1 rounded hover:bg-black/5',
              'focus:outline-none focus:ring-2 focus:ring-current',
              'transition-colors',
            ].join(' ')}
            aria-label="Dismiss alert"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default Alert;
