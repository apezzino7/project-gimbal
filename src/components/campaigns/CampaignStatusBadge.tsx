/**
 * Campaign Status Badge
 * Color-coded badge displaying campaign status
 */

import { Badge } from '../common/Badge';
import type { CampaignStatus } from '@/types/campaign';
import { CAMPAIGN_STATUS_LABELS } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignStatusBadgeProps {
  status: CampaignStatus;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_VARIANTS: Record<CampaignStatus, BadgeVariant> = {
  draft: 'default',
  scheduled: 'info',
  sending: 'warning',
  sent: 'success',
  failed: 'danger',
  cancelled: 'default',
};

// =============================================================================
// Component
// =============================================================================

export function CampaignStatusBadge({ status, className }: CampaignStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status];
  const label = CAMPAIGN_STATUS_LABELS[status];

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}

export default CampaignStatusBadge;
