import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Label text displayed above the select */
  label?: string;
  /** Helper text displayed below the select */
  helperText?: string;
  /** Error message - also sets error styling */
  error?: string;
  /** Size variant */
  size?: SelectSize;
  /** Array of options */
  options: SelectOption[];
  /** Placeholder text shown when no value is selected */
  placeholder?: string;
  /** Makes select take full width of container */
  fullWidth?: boolean;
  /** Hides the label visually but keeps it accessible */
  hideLabel?: boolean;
  /** Icon to show at the start */
  leftIcon?: ReactNode;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = [
  'block w-full rounded-lg border bg-white appearance-none cursor-pointer',
  'text-[#003559]',
  'transition-colors duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-0',
  'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
  'pr-10', // Space for chevron
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

const sizeStyles: Record<SelectSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-4 py-3 text-lg min-h-[48px]',
};

const labelSizeStyles: Record<SelectSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Select component with label, validation states, and options.
 *
 * @example
 * // Basic usage
 * <Select
 *   label="Country"
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'ca', label: 'Canada' },
 *   ]}
 * />
 *
 * @example
 * // With placeholder
 * <Select label="Status" placeholder="Select a status..." options={statusOptions} />
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    helperText,
    error,
    size = 'md',
    options,
    placeholder,
    fullWidth = true,
    hideLabel = false,
    leftIcon,
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

  const hasLeftIcon = !!leftIcon;

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

      {/* Select wrapper */}
      <div className="relative">
        {/* Left icon */}
        {hasLeftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-500">
            {leftIcon}
          </div>
        )}

        {/* Select */}
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={[
            baseStyles,
            error ? errorBorderStyles : normalBorderStyles,
            sizeStyles[size],
            hasLeftIcon ? 'pl-10' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Chevron icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
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

export default Select;
