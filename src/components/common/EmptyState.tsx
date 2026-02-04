import type { ReactNode } from 'react';
import { Button } from './Button';
import type { ButtonProps } from './Button';

// =============================================================================
// Types
// =============================================================================

export interface EmptyStateProps {
  /** Icon to display (optional) */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Default Icons
// =============================================================================

function DefaultEmptyIcon() {
  return (
    <svg
      className="h-12 w-12 text-gray-300"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Empty state component for when there's no data to display.
 *
 * @example
 * // Basic usage
 * <EmptyState
 *   title="No campaigns yet"
 *   description="Get started by creating your first campaign."
 *   action={{ label: "Create Campaign", onClick: handleCreate }}
 * />
 *
 * @example
 * // With custom icon
 * <EmptyState
 *   icon={<SearchIcon />}
 *   title="No results found"
 *   description="Try adjusting your search or filters."
 * />
 *
 * @example
 * // With secondary action
 * <EmptyState
 *   title="No data sources"
 *   description="Connect a data source to start importing data."
 *   action={{ label: "Add Data Source", onClick: handleAdd }}
 *   secondaryAction={{ label: "Learn More", onClick: handleHelp }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Icon */}
      <div className="mb-4">{icon || <DefaultEmptyIcon />}</div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-[#003559] mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 max-w-sm mb-6">{description}</p>
      )}

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button variant={action.variant || 'primary'} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Error state variant for when something goes wrong.
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'An unexpected error occurred. Please try again.',
  onRetry,
  className = '',
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12 text-[#d32f2f]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      }
      title={title}
      description={description}
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      className={className}
    />
  );
}

export default EmptyState;
