import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label?: string;
  /** Helper text displayed below the input */
  helperText?: string;
  /** Error message - also sets error styling */
  error?: string;
  /** Size variant */
  size?: InputSize;
  /** Icon or element to show at the start of the input */
  leftAddon?: ReactNode;
  /** Icon or element to show at the end of the input */
  rightAddon?: ReactNode;
  /** Makes input take full width of container */
  fullWidth?: boolean;
  /** Hides the label visually but keeps it accessible */
  hideLabel?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const baseInputStyles = [
  'block w-full rounded-lg border bg-white',
  'text-[#003559] placeholder:text-gray-400',
  'transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
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

const sizeStyles: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-4 py-3 text-lg min-h-[48px]',
};

const labelSizeStyles: Record<InputSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Input component with label, validation states, and addons.
 *
 * @example
 * // Basic usage
 * <Input label="Email" type="email" placeholder="you@example.com" />
 *
 * @example
 * // With error
 * <Input label="Password" type="password" error="Password is required" />
 *
 * @example
 * // With addons
 * <Input label="Website" leftAddon="https://" placeholder="example.com" />
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    helperText,
    error,
    size = 'md',
    leftAddon,
    rightAddon,
    fullWidth = true,
    hideLabel = false,
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

  const hasLeftAddon = !!leftAddon;
  const hasRightAddon = !!rightAddon;

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

      {/* Input wrapper for addons */}
      <div className="relative">
        {/* Left addon */}
        {hasLeftAddon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            {leftAddon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={[
            baseInputStyles,
            error ? errorBorderStyles : normalBorderStyles,
            sizeStyles[size],
            hasLeftAddon ? 'pl-10' : '',
            hasRightAddon ? 'pr-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        />

        {/* Right addon */}
        {hasRightAddon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
            {rightAddon}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          role="alert"
          aria-live="assertive"
          className="mt-1.5 text-sm text-[#d32f2f]"
        >
          {error}
        </p>
      )}

      {/* Helper text */}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-gray-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

export default Input;
