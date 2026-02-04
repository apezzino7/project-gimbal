/**
 * Message Status Badge
 * Color-coded badge displaying message delivery status
 */

import { Badge } from '../common/Badge';
import type { MessageStatus } from '@/types/campaign';
import { MESSAGE_STATUS_LABELS } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface MessageStatusBadgeProps {
  status: MessageStatus;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_VARIANTS: Record<MessageStatus, BadgeVariant> = {
  queued: 'default',
  sent: 'info',
  delivered: 'success',
  opened: 'success',
  clicked: 'success',
  bounced: 'warning',
  failed: 'danger',
};

// =============================================================================
// Component
// =============================================================================

export function MessageStatusBadge({ status, className }: MessageStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status];
  const label = MESSAGE_STATUS_LABELS[status];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export default MessageStatusBadge;
