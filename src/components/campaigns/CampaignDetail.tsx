/**
 * Campaign Detail
 * Full campaign view with metrics, content preview, and message tracking
 */

import { useState } from 'react';
import { Card } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignTypeIcon } from './CampaignTypeIcon';
import { CampaignMetrics } from './CampaignMetrics';
import { MessageList } from './MessageList';
import { useCampaign, useCampaignMetrics, useScheduleCampaign, useCancelCampaign } from '@/services/campaigns';
import type { Campaign } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignDetailProps {
  campaignId: string;
  onEdit?: (campaign: Campaign) => void;
  onBack?: () => void;
  className?: string;
}

type Tab = 'overview' | 'messages' | 'content';

// =============================================================================
// Component
// =============================================================================

export function CampaignDetail({
  campaignId,
  onEdit,
  onBack,
  className = '',
}: CampaignDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Data fetching
  const { data: campaign, isLoading, error } = useCampaign(campaignId);
  const { data: metrics } = useCampaignMetrics(campaignId);

  // Mutations
  const scheduleMutation = useScheduleCampaign();
  const cancelMutation = useCancelCampaign();

  // Handlers
  const handleSchedule = async (scheduledAt: string) => {
    await scheduleMutation.mutateAsync({ id: campaignId, scheduledAt });
    setShowScheduleModal(false);
  };

  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this campaign?')) {
      await cancelMutation.mutateAsync(campaignId);
    }
  };

  const handleSendNow = async () => {
    if (window.confirm('Are you sure you want to send this campaign now?')) {
      await scheduleMutation.mutateAsync({ id: campaignId, scheduledAt: new Date().toISOString() });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center py-8">
          <p className="text-[#d32f2f]">Failed to load campaign</p>
          {onBack && (
            <Button variant="outline" onClick={onBack} className="mt-4">
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  const canEdit = campaign.status === 'draft';
  const canSchedule = campaign.status === 'draft';
  const canCancel = campaign.status === 'scheduled';
  const canSendNow = campaign.status === 'draft';

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card padding="lg">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Button>
            )}
            <div>
              <div className="flex items-center gap-3">
                <CampaignTypeIcon type={campaign.campaignType} size="lg" />
                <h1 className="text-2xl font-semibold text-[#003559]">{campaign.name}</h1>
                <CampaignStatusBadge status={campaign.status} />
              </div>
              {campaign.description && (
                <p className="text-gray-600 mt-2">{campaign.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                {campaign.scheduledAt && (
                  <span>Scheduled for {new Date(campaign.scheduledAt).toLocaleString()}</span>
                )}
                {campaign.site && (
                  <Badge variant="default">{campaign.site.name}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {canEdit && onEdit && (
              <Button variant="outline" onClick={() => onEdit(campaign)}>
                Edit
              </Button>
            )}
            {canSchedule && (
              <Button variant="outline" onClick={() => setShowScheduleModal(true)}>
                Schedule
              </Button>
            )}
            {canSendNow && (
              <Button onClick={handleSendNow} loading={scheduleMutation.isPending}>
                Send Now
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" onClick={handleCancel} loading={cancelMutation.isPending}>
                Cancel Campaign
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-[#e0e0e0]">
        <nav className="flex gap-6">
          {(['overview', 'messages', 'content'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#0353a4] text-[#0353a4]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics */}
          {metrics && <CampaignMetrics metrics={metrics} campaignType={campaign.campaignType} />}

          {/* Campaign Info */}
          <Card padding="lg">
            <h3 className="text-lg font-medium text-[#003559] mb-4">Campaign Details</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-500">Type</dt>
                <dd className="text-sm font-medium capitalize">{campaign.campaignType}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Target Audience</dt>
                <dd className="text-sm font-medium">
                  {campaign.targetAllMembers
                    ? 'All Members'
                    : `Members with status: ${campaign.membershipStatuses.join(', ')}`}
                </dd>
              </div>
              {campaign.campaignType === 'email' && campaign.subject && (
                <div className="col-span-2">
                  <dt className="text-sm text-gray-500">Subject Line</dt>
                  <dd className="text-sm font-medium">{campaign.subject}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-500">Total Recipients</dt>
                <dd className="text-sm font-medium">{campaign.totalRecipients.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Messages Sent</dt>
                <dd className="text-sm font-medium">{campaign.totalSent.toLocaleString()}</dd>
              </div>
            </dl>
          </Card>

          {/* Timeline */}
          <Card padding="lg">
            <h3 className="text-lg font-medium text-[#003559] mb-4">Timeline</h3>
            <div className="space-y-3">
              <TimelineItem
                label="Created"
                date={campaign.createdAt}
                completed
              />
              {campaign.scheduledAt && (
                <TimelineItem
                  label="Scheduled"
                  date={campaign.scheduledAt}
                  completed={!!campaign.startedAt}
                />
              )}
              {campaign.startedAt && (
                <TimelineItem
                  label="Started Sending"
                  date={campaign.startedAt}
                  completed
                />
              )}
              {campaign.completedAt && (
                <TimelineItem
                  label="Completed"
                  date={campaign.completedAt}
                  completed
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'messages' && (
        <MessageList campaignId={campaignId} />
      )}

      {activeTab === 'content' && (
        <Card padding="lg">
          <h3 className="text-lg font-medium text-[#003559] mb-4">Message Content</h3>
          {campaign.campaignType === 'email' && campaign.subject && (
            <div className="mb-4">
              <label className="text-sm text-gray-500">Subject</label>
              <p className="text-sm font-medium">{campaign.subject}</p>
            </div>
          )}
          <div>
            <label className="text-sm text-gray-500">Body</label>
            <div className="mt-2 p-4 bg-[#f5f5f5] rounded-lg font-mono text-sm whitespace-pre-wrap">
              {campaign.content}
            </div>
          </div>
        </Card>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          onSchedule={handleSchedule}
          onClose={() => setShowScheduleModal(false)}
          loading={scheduleMutation.isPending}
        />
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TimelineItem({
  label,
  date,
  completed,
}: {
  label: string;
  date: string;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-3 h-3 rounded-full ${
          completed ? 'bg-[#2e7d32]' : 'bg-gray-300'
        }`}
      />
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm text-gray-500">
        {new Date(date).toLocaleString()}
      </span>
    </div>
  );
}

function ScheduleModal({
  onSchedule,
  onClose,
  loading,
}: {
  onSchedule: (scheduledAt: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [dateTime, setDateTime] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (dateTime) {
      onSchedule(new Date(dateTime).toISOString());
    }
  };

  // Get minimum date (now + 5 minutes)
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold text-[#003559] mb-4">Schedule Campaign</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="schedule-datetime" className="block text-sm font-medium text-gray-700 mb-1">
              Send Date & Time
            </label>
            <input
              type="datetime-local"
              id="schedule-datetime"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              min={minDateTime}
              className="w-full px-3 py-2 border border-[#e0e0e0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0353a4]"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Note: SMS campaigns will respect quiet hours (8 AM - 9 PM recipient timezone)
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Schedule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CampaignDetail;
