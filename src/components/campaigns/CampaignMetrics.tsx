/**
 * Campaign Metrics
 * Display campaign statistics and delivery metrics
 */

import { useMemo } from 'react';
import { Card } from '../common/Card';
import type { CampaignMetrics as CampaignMetricsType, CampaignType } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignMetricsProps {
  metrics: CampaignMetricsType | null;
  campaignType: CampaignType;
  loading?: boolean;
  className?: string;
}

// =============================================================================
// Sub-components
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

function MetricCard({ label, value, subValue, color = 'default' }: MetricCardProps) {
  const colorClasses = {
    default: 'text-[#003559]',
    success: 'text-[#2e7d32]',
    warning: 'text-[#ed6c02]',
    danger: 'text-[#d32f2f]',
  };

  return (
    <div className="text-center p-4 bg-[#f5f5f5] rounded-lg">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
    </div>
  );
}

function MetricSkeleton() {
  return (
    <div className="text-center p-4 bg-[#f5f5f5] rounded-lg animate-pulse">
      <div className="h-4 w-20 bg-gray-200 rounded mx-auto mb-2" />
      <div className="h-8 w-16 bg-gray-200 rounded mx-auto" />
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CampaignMetrics({
  metrics,
  campaignType,
  loading = false,
  className = '',
}: CampaignMetricsProps) {
  const formattedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      sent: metrics.totalSent.toLocaleString(),
      delivered: metrics.totalDelivered.toLocaleString(),
      failed: metrics.totalFailed.toLocaleString(),
      opened: metrics.totalOpened.toLocaleString(),
      clicked: metrics.totalClicked.toLocaleString(),
      deliveryRate: `${metrics.deliveryRate.toFixed(1)}%`,
      openRate: `${metrics.openRate.toFixed(1)}%`,
      clickRate: `${metrics.clickRate.toFixed(1)}%`,
    };
  }, [metrics]);

  if (loading) {
    return (
      <Card className={className} padding="md">
        <h3 className="text-lg font-semibold text-[#003559] mb-4">Campaign Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
          <MetricSkeleton />
        </div>
      </Card>
    );
  }

  if (!metrics || !formattedMetrics) {
    return (
      <Card className={className} padding="md">
        <h3 className="text-lg font-semibold text-[#003559] mb-4">Campaign Performance</h3>
        <p className="text-gray-500 text-center py-8">
          No metrics available yet. Metrics will appear once the campaign is sent.
        </p>
      </Card>
    );
  }

  return (
    <Card className={className} padding="md">
      <h3 className="text-lg font-semibold text-[#003559] mb-4">Campaign Performance</h3>

      {/* Primary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Sent"
          value={formattedMetrics.sent}
          subValue={`of ${metrics.totalRecipients.toLocaleString()}`}
        />
        <MetricCard
          label="Delivered"
          value={formattedMetrics.delivered}
          subValue={formattedMetrics.deliveryRate}
          color="success"
        />
        <MetricCard
          label="Failed"
          value={formattedMetrics.failed}
          color={metrics.totalFailed > 0 ? 'danger' : 'default'}
        />
        {campaignType === 'email' && (
          <MetricCard
            label="Bounced"
            value={metrics.totalBounced.toLocaleString()}
            color={metrics.totalBounced > 0 ? 'warning' : 'default'}
          />
        )}
      </div>

      {/* Email-specific metrics */}
      {campaignType === 'email' && (
        <>
          <h4 className="text-sm font-medium text-gray-500 mb-3">Engagement</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard
              label="Opened"
              value={formattedMetrics.opened}
              subValue={formattedMetrics.openRate}
              color="success"
            />
            <MetricCard
              label="Clicked"
              value={formattedMetrics.clicked}
              subValue={formattedMetrics.clickRate}
              color="success"
            />
            <MetricCard
              label="Click-to-Open"
              value={
                metrics.totalOpened > 0
                  ? `${((metrics.totalClicked / metrics.totalOpened) * 100).toFixed(1)}%`
                  : '0%'
              }
            />
          </div>
        </>
      )}

      {/* Progress bar */}
      {metrics.totalRecipients > 0 && (
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Delivery Progress</span>
            <span>
              {metrics.totalSent} / {metrics.totalRecipients}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#0353a4] transition-all duration-300"
              style={{
                width: `${(metrics.totalSent / metrics.totalRecipients) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

export default CampaignMetrics;
