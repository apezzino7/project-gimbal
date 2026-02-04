import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading spinner and disables button */
  loading?: boolean;
  /** Icon to show before the label */
  leftIcon?: ReactNode;
  /** Icon to show after the label */
  rightIcon?: ReactNode;
  /** Makes button take full width of container */
  fullWidth?: boolean;
  /** Button contents */
  children: ReactNode;
}

// =============================================================================
// Styles
// =============================================================================

const baseStyles = [
  'inline-flex items-center justify-center gap-2',
  'font-medium rounded-lg',
  'transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:ring-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed',
].join(' ');

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#0353a4] text-white',
    'hover:bg-[#003559]',
    'focus:ring-[#0353a4]',
    'active:bg-[#002a47]',
  ].join(' '),
  secondary: [
    'bg-[#006daa] text-white',
    'hover:bg-[#005a8c]',
    'focus:ring-[#006daa]',
    'active:bg-[#004a73]',
  ].join(' '),
  danger: [
    'bg-[#d32f2f] text-white',
    'hover:bg-[#b71c1c]',
    'focus:ring-[#d32f2f]',
    'active:bg-[#9a1515]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[#003559]',
    'hover:bg-[#b9d6f2]/30',
    'focus:ring-[#0353a4]',
    'active:bg-[#b9d6f2]/50',
  ].join(' '),
  outline: [
    'bg-transparent text-[#0353a4] border-2 border-[#0353a4]',
    'hover:bg-[#0353a4] hover:text-white',
    'focus:ring-[#0353a4]',
    'active:bg-[#003559]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-6 py-3 text-lg min-h-[48px]',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Button component with multiple variants and states.
 *
 * @example
 * // Primary button
 * <Button variant="primary">Save Changes</Button>
 *
 * @example
 * // Loading state
 * <Button loading>Processing...</Button>
 *
 * @example
 * // With icons
 * <Button leftIcon={<PlusIcon />}>Add Item</Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={[
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <Spinner size={size} />
      ) : leftIcon ? (
        <span className="shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}

      <span>{children}</span>

      {!loading && rightIcon && (
        <span className="shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </button>
  );
});

// =============================================================================
// Spinner (internal)
// =============================================================================

interface SpinnerProps {
  size: ButtonSize;
}

function Spinner({ size }: SpinnerProps) {
  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
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
  );
}

export default Button;
