import { forwardRef, useId } from 'react';
import type { TextareaHTMLAttributes } from 'react';

// =============================================================================
// Types
// =============================================================================

export type TextareaSize = 'sm' | 'md' | 'lg';

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Label text displayed above the textarea */
  label?: string;
  /** Helper text displayed below the textarea */
  helperText?: string;
  /** Error message - also sets error styling */
  error?: string;
  /** Size variant */
  size?: TextareaSize;
  /** Makes textarea take full width of container */
  fullWidth?: boolean;
  /** Hides the label visually but keeps it accessible */
  hideLabel?: boolean;
  /** Shows character count */
  showCount?: boolean;
  /** Maximum characters (also enables showCount) */
  maxLength?: number;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = [
  'block w-full rounded-lg border bg-white resize-y',
  'text-[#003559] placeholder:text-gray-400',
  'transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:resize-none',
].join(' ');

const normalBorderStyles = [
  'border-[#e0e0e0]',
  'hover:border-[#0353a4]',
  'focus:border-[#0353a4] focus:ring-[#0353a4]/20',
].join(' ');

const errorBorderStyles = [
  'border-[#d32f2f]',
  'focus:border-[#d32f2f] focus:ring-[#d32f2f]/20',
].join(' ');

const sizeStyles: Record<TextareaSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[80px]',
  md: 'px-4 py-2 text-base min-h-[120px]',
  lg: 'px-4 py-3 text-lg min-h-[160px]',
};

const labelSizeStyles: Record<TextareaSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Textarea component with label, validation states, and character count.
 *
 * @example
 * // Basic usage
 * <Textarea label="Description" placeholder="Enter a description..." />
 *
 * @example
 * // With character limit
 * <Textarea label="Bio" maxLength={160} showCount />
 *
 * @example
 * // With error
 * <Textarea label="Message" error="Message is required" />
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helperText,
    error,
    size = 'md',
    fullWidth = true,
    hideLabel = false,
    showCount = false,
    maxLength,
    className = '',
    id: providedId,
    disabled,
    value,
    defaultValue,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = error ? `${id}-error` : undefined;
  const helperId = helperText && !error ? `${id}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

  // Character count logic
  const shouldShowCount = showCount || maxLength !== undefined;
  const currentLength =
    typeof value === 'string'
      ? value.length
      : typeof defaultValue === 'string'
        ? defaultValue.length
        : 0;
  const isOverLimit = maxLength !== undefined && currentLength > maxLength;

  return (
    <div className={fullWidth ? 'w-full' : 'inline-block'}>
      {/* Label */}
      {label && (
        <label
          htmlFor={id}
          className={[
            'block font-medium text-[#003559] mb-1.5',
            labelSizeStyles[size],
            hideLabel ? 'sr-only' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {label}
          {props.required && (
            <span className="text-[#d32f2f] ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {/* Textarea */}
      <textarea
        ref={ref}
        id={id}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        aria-invalid={!!error || isOverLimit}
        aria-describedby={describedBy}
        className={[
          baseStyles,
          error || isOverLimit ? errorBorderStyles : normalBorderStyles,
          sizeStyles[size],
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      />

      {/* Footer: Error/Helper + Character count */}
      <div className="flex justify-between items-start mt-1.5 gap-4">
        <div className="flex-1">
          {/* Error message */}
          {error && (
            <p
              id={errorId}
              role="alert"
              aria-live="assertive"
              className="text-sm text-[#d32f2f]"
            >
              {error}
            </p>
          )}

          {/* Helper text */}
          {helperText && !error && (
            <p id={helperId} className="text-sm text-gray-500">
              {helperText}
            </p>
          )}
        </div>

        {/* Character count */}
        {shouldShowCount && (
          <p
            className={[
              'text-sm shrink-0',
              isOverLimit ? 'text-[#d32f2f]' : 'text-gray-500',
            ].join(' ')}
            aria-live="polite"
          >
            {currentLength}
            {maxLength !== undefined && ` / ${maxLength}`}
          </p>
        )}
      </div>
    </div>
  );
});

export default Textarea;
