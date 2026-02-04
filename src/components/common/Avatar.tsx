import type { HTMLAttributes } from 'react';

// =============================================================================
// Types
// =============================================================================

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Image source URL */
  src?: string | null;
  /** Alt text for image */
  alt?: string;
  /** Name for generating initials fallback */
  name?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Show online status indicator */
  status?: 'online' | 'offline' | 'busy' | 'away';
}

// =============================================================================
// Styles
// =============================================================================

const sizeStyles: Record<AvatarSize, { container: string; text: string; status: string }> = {
  xs: { container: 'h-6 w-6', text: 'text-xs', status: 'h-1.5 w-1.5 ring-1' },
  sm: { container: 'h-8 w-8', text: 'text-sm', status: 'h-2 w-2 ring-2' },
  md: { container: 'h-10 w-10', text: 'text-base', status: 'h-2.5 w-2.5 ring-2' },
  lg: { container: 'h-12 w-12', text: 'text-lg', status: 'h-3 w-3 ring-2' },
  xl: { container: 'h-16 w-16', text: 'text-xl', status: 'h-4 w-4 ring-2' },
};

const statusColors: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-[#2e7d32]',
  offline: 'bg-gray-400',
  busy: 'bg-[#d32f2f]',
  away: 'bg-[#ed6c02]',
};

// =============================================================================
// Helpers
// =============================================================================

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-[#0353a4]',
    'bg-[#006daa]',
    'bg-[#003559]',
    'bg-[#2e7d32]',
    'bg-[#ed6c02]',
    'bg-[#d32f2f]',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// =============================================================================
// Component
// =============================================================================

/**
 * Avatar component for displaying user profile images or initials.
 *
 * @example
 * // With image
 * <Avatar src="/user.jpg" alt="John Doe" />
 *
 * @example
 * // With initials fallback
 * <Avatar name="John Doe" />
 *
 * @example
 * // With status indicator
 * <Avatar src="/user.jpg" name="John" status="online" />
 *
 * @example
 * // Different sizes
 * <Avatar name="JD" size="sm" />
 * <Avatar name="JD" size="lg" />
 */
export function Avatar({
  src,
  alt = '',
  name = '',
  size = 'md',
  status,
  className = '',
  ...props
}: AvatarProps) {
  const styles = sizeStyles[size];
  const initials = name ? getInitials(name) : '?';
  const bgColor = name ? getColorFromName(name) : 'bg-gray-300';

  return (
    <div className={['relative inline-block', className].filter(Boolean).join(' ')} {...props}>
      {src ? (
        <img
          src={src}
          alt={alt || name}
          className={[
            styles.container,
            'rounded-full object-cover',
          ].join(' ')}
          onError={(e) => {
            // Hide broken image and show fallback
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}

      {/* Initials fallback (shown when no src or image fails to load) */}
      <div
        className={[
          styles.container,
          'rounded-full flex items-center justify-center',
          bgColor,
          src ? 'hidden' : '',
        ].join(' ')}
        aria-hidden={!!src}
      >
        <span className={[styles.text, 'font-medium text-white'].join(' ')}>{initials}</span>
      </div>

      {/* Status indicator */}
      {status && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full ring-white',
            statusColors[status],
            styles.status,
          ].join(' ')}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
}

/**
 * Avatar group for showing multiple avatars stacked.
 */
export function AvatarGroup({
  children,
  max = 5,
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  max?: number;
  size?: AvatarSize;
  className?: string;
}) {
  const childArray = Array.isArray(children) ? children : [children];
  const visibleChildren = childArray.slice(0, max);
  const remainingCount = childArray.length - max;
  const styles = sizeStyles[size];

  return (
    <div className={['flex -space-x-2', className].filter(Boolean).join(' ')}>
      {visibleChildren.map((child, index) => (
        <div key={index} className="ring-2 ring-white rounded-full">
          {child}
        </div>
      ))}
      {remainingCount > 0 && (
        <div
          className={[
            styles.container,
            'rounded-full flex items-center justify-center',
            'bg-gray-200 text-gray-600 ring-2 ring-white',
          ].join(' ')}
        >
          <span className={[styles.text, 'font-medium'].join(' ')}>+{remainingCount}</span>
        </div>
      )}
    </div>
  );
}

export default Avatar;
