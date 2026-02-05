/**
 * RoleBadge Component
 * Displays a user role as a styled badge
 */

import { Badge } from '@/components/common/Badge';
import type { BadgeVariant, BadgeSize } from '@/components/common/Badge';
import type { UserRole } from '@/types/admin';
import { ROLE_LABELS } from '@/types/admin';

// =============================================================================
// Types
// =============================================================================

export interface RoleBadgeProps {
  /** The user role to display */
  role: UserRole;
  /** Size of the badge */
  size?: BadgeSize;
  /** Show dot indicator */
  dot?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Styles
// =============================================================================

const roleVariants: Record<UserRole, BadgeVariant> = {
  admin: 'danger',
  user: 'primary',
  viewer: 'default',
};

// =============================================================================
// Component
// =============================================================================

/**
 * RoleBadge - Displays a user role with appropriate styling
 *
 * @example
 * <RoleBadge role="admin" />
 * <RoleBadge role="user" size="sm" dot />
 */
export function RoleBadge({
  role,
  size = 'sm',
  dot = false,
  className = '',
}: RoleBadgeProps) {
  return (
    <Badge
      variant={roleVariants[role]}
      size={size}
      dot={dot}
      rounded
      className={className}
    >
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export default RoleBadge;
