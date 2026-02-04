import type { HTMLAttributes, ReactNode } from 'react';

// =============================================================================
// Types
// =============================================================================

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card content */
  children: ReactNode;
  /** Padding size */
  padding?: CardPadding;
  /** Optional header content */
  header?: ReactNode;
  /** Optional footer content */
  footer?: ReactNode;
  /** Adds hover effect for interactive cards */
  hoverable?: boolean;
  /** Adds border styling */
  bordered?: boolean;
  /** Makes card take full height of container */
  fullHeight?: boolean;
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Optional action buttons on the right */
  actions?: ReactNode;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Alignment of footer content */
  align?: 'left' | 'center' | 'right' | 'between';
}

// =============================================================================
// Styles
// =============================================================================

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const footerAlignStyles: Record<NonNullable<CardFooterProps['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

// =============================================================================
// Components
// =============================================================================

/**
 * Card component for containing related content.
 *
 * @example
 * // Basic usage
 * <Card>
 *   <p>Card content</p>
 * </Card>
 *
 * @example
 * // With header and footer
 * <Card
 *   header={<CardHeader>Title</CardHeader>}
 *   footer={<CardFooter align="right"><Button>Save</Button></CardFooter>}
 * >
 *   <p>Card content</p>
 * </Card>
 *
 * @example
 * // Hoverable card
 * <Card hoverable onClick={() => navigate('/item')}>
 *   <p>Click me</p>
 * </Card>
 */
export function Card({
  children,
  padding = 'md',
  header,
  footer,
  hoverable = false,
  bordered = true,
  fullHeight = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'bg-white rounded-xl overflow-hidden',
        bordered ? 'border border-[#e0e0e0]' : 'shadow-sm',
        hoverable
          ? 'transition-all duration-200 hover:shadow-md hover:border-[#b9d6f2] cursor-pointer'
          : '',
        fullHeight ? 'h-full flex flex-col' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {header}
      <div
        className={[paddingStyles[padding], fullHeight ? 'flex-1' : '']
          .filter(Boolean)
          .join(' ')}
      >
        {children}
      </div>
      {footer}
    </div>
  );
}

/**
 * Card header component with optional actions.
 */
export function CardHeader({ children, actions, className = '', ...props }: CardHeaderProps) {
  return (
    <div
      className={[
        'px-4 py-3 border-b border-[#e0e0e0] bg-[#f5f5f5]/50',
        'flex items-center justify-between gap-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      <div className="font-semibold text-[#003559]">{children}</div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Card footer component with alignment options.
 */
export function CardFooter({
  children,
  align = 'right',
  className = '',
  ...props
}: CardFooterProps) {
  return (
    <div
      className={[
        'px-4 py-3 border-t border-[#e0e0e0] bg-[#f5f5f5]/50',
        'flex items-center gap-3',
        footerAlignStyles[align],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
