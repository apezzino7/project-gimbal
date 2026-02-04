import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Label text displayed next to the checkbox */
  label?: ReactNode;
  /** Helper text displayed below the checkbox */
  helperText?: string;
  /** Error message - also sets error styling */
  error?: string;
  /** Size variant */
  size?: CheckboxSize;
  /** Indeterminate state (partially checked) */
  indeterminate?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const sizeStyles: Record<CheckboxSize, { checkbox: string; label: string }> = {
  sm: {
    checkbox: 'h-4 w-4',
    label: 'text-sm',
  },
  md: {
    checkbox: 'h-5 w-5',
    label: 'text-base',
  },
  lg: {
    checkbox: 'h-6 w-6',
    label: 'text-lg',
  },
};

// =============================================================================
// Component
// =============================================================================

/**
 * Checkbox component with label and validation states.
 *
 * @example
 * // Basic usage
 * <Checkbox label="I agree to the terms" />
 *
 * @example
 * // With error
 * <Checkbox label="Accept privacy policy" error="You must accept the privacy policy" />
 *
 * @example
 * // Indeterminate state
 * <Checkbox label="Select all" indeterminate />
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    helperText,
    error,
    size = 'md',
    indeterminate = false,
    className = '',
    id: providedId,
    disabled,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText && !error ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  const styles = sizeStyles[size];

  return (
    <div className={className}>
      <div className="flex items-start gap-3">
        {/* Checkbox input */}
        <div className="flex items-center h-6">
          <input
            ref={(node) => {
              if (node) {
                node.indeterminate = indeterminate;
              }
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            type="checkbox"
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={[
              styles.checkbox,
              'rounded border-2 cursor-pointer',
              'text-[#0353a4] bg-white',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:ring-offset-2',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-[#d32f2f]' : 'border-[#e0e0e0] hover:border-[#0353a4]',
            ].join(' ')}
            {...props}
          />
        </div>

        {/* Label and helper text */}
        {(label || helperText || error) && (
          <div className="flex-1">
            {label && (
              <label
                htmlFor={id}
                className={[
                  styles.label,
                  'font-medium text-[#003559] cursor-pointer',
                  disabled ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {label}
                {props.required && (
                  <span className="text-[#d32f2f] ml-0.5" aria-hidden="true">
                    *
                  </span>
                )}
              </label>
            )}

            {/* Error message */}
            {error && (
              <p
                id={errorId}
                role="alert"
                aria-live="assertive"
                className="mt-1 text-sm text-[#d32f2f]"
              >
                {error}
              </p>
            )}

            {/* Helper text */}
            {helperText && !error && (
              <p id={helperId} className="mt-1 text-sm text-gray-500">
                {helperText}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default Checkbox;
