/**
 * Message List
 * Table displaying individual message delivery status for a campaign
 */

import { useState } from 'react';
import { Card } from '../common/Card';
import { Select } from '../common/Select';
import { MessageStatusBadge } from './MessageStatusBadge';
import { useCampaignMessages } from '@/services/campaigns';
import type { MessageStatus, CampaignMessageWithMember } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface MessageListProps {
  campaignId: string;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed', label: 'Failed' },
];

// =============================================================================
// Component
// =============================================================================

export function MessageList({ campaignId, className = '' }: MessageListProps) {
  const [statusFilter, setStatusFilter] = useState<MessageStatus | ''>('');

  const { data: messages, isLoading, error } = useCampaignMessages(campaignId, {
    status: statusFilter || undefined,
    limit: 100,
  });

  // Loading state
  if (isLoading) {
    return (
      <Card className={className} padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center py-8">
          <p className="text-[#d32f2f]">Failed to load messages</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      {/* Header with filter */}
      <div className="p-4 border-b border-[#e0e0e0] flex items-center justify-between">
        <h3 className="text-lg font-medium text-[#003559]">
          Messages ({messages?.length || 0})
        </h3>
        <div className="w-48">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MessageStatus | '')}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {/* Table */}
      {messages && messages.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f5f5f5]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-2 text-gray-500">No messages yet</p>
          <p className="text-sm text-gray-400">Messages will appear here once the campaign starts sending</p>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function MessageRow({ message }: { message: CampaignMessageWithMember }) {
  const recipientName = message.member
    ? `${message.member.firstName || ''} ${message.member.lastName || ''}`.trim() || 'Unknown'
    : 'Unknown';

  const getLastUpdateTime = () => {
    if (message.failedAt) return message.failedAt;
    if (message.clickedAt) return message.clickedAt;
    if (message.openedAt) return message.openedAt;
    if (message.deliveredAt) return message.deliveredAt;
    if (message.sentAt) return message.sentAt;
    return message.queuedAt;
  };

  const lastUpdate = getLastUpdateTime();

  return (
    <tr className="hover:bg-[#f5f5f5] transition-colors">
      <td className="px-4 py-3 text-sm text-gray-900">
        {recipientName}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
        {message.recipientAddress}
      </td>
      <td className="px-4 py-3">
        <MessageStatusBadge status={message.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {message.sentAt ? new Date(message.sentAt).toLocaleString() : '-'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {lastUpdate ? new Date(lastUpdate).toLocaleString() : '-'}
      </td>
    </tr>
  );
}

export default MessageList;
