/**
 * Campaign List
 * Table view of campaigns with search, filters, and pagination
 */

import { useState, useMemo, useCallback } from 'react';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Card } from '../common/Card';
import { Skeleton } from '../Skeleton';
import { CampaignStatusBadge } from './CampaignStatusBadge';
import { CampaignTypeIcon } from './CampaignTypeIcon';
import { useCampaigns } from '@/services/campaigns';
import type { Campaign, CampaignStatus, CampaignType } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignListProps {
  siteId?: string;
  onSelect?: (campaignId: string) => void;
  onCreate?: () => void;
  className?: string;
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const PAGE_SIZE = 25;

// =============================================================================
// Sub-components
// =============================================================================

interface CampaignRowProps {
  campaign: Campaign;
  onSelect?: (id: string) => void;
}

function CampaignRow({ campaign, onSelect }: CampaignRowProps) {
  const formattedDate = useMemo(() => {
    const date = campaign.scheduledAt || campaign.createdAt;
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [campaign]);

  const handleClick = useCallback(() => {
    onSelect?.(campaign.id);
  }, [campaign.id, onSelect]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect?.(campaign.id);
      }
    },
    [campaign.id, onSelect]
  );

  return (
    <tr
      className="hover:bg-[#f5f5f5] transition-colors cursor-pointer"
      onClick={handleClick}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#b9d6f2]/30 rounded-lg text-[#0353a4]">
            <CampaignTypeIcon type={campaign.campaignType} size="sm" />
          </div>
          <div>
            <div className="font-medium text-[#003559]">{campaign.name}</div>
            {campaign.description && (
              <div className="text-xs text-gray-500 truncate max-w-xs">
                {campaign.description}
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <CampaignStatusBadge status={campaign.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3 text-sm text-right">
        {campaign.totalSent > 0 ? (
          <span className="text-gray-700">
            {campaign.totalSent.toLocaleString()}
            <span className="text-gray-400"> / </span>
            {campaign.totalRecipients.toLocaleString()}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-right">
        {campaign.totalDelivered > 0 && campaign.totalSent > 0 ? (
          <span className="text-[#2e7d32]">
            {((campaign.totalDelivered / campaign.totalSent) * 100).toFixed(1)}%
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {[...Array(5)].map((_, i) => (
        <tr key={i}>
          <td className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Skeleton width={36} height={36} />
              <div>
                <Skeleton width={160} height={16} className="mb-1" />
                <Skeleton width={100} height={12} />
              </div>
            </div>
          </td>
          <td className="px-4 py-3">
            <Skeleton width={80} height={24} />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={100} height={16} />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={60} height={16} className="ml-auto" />
          </td>
          <td className="px-4 py-3">
            <Skeleton width={50} height={16} className="ml-auto" />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

// =============================================================================
// Component
// =============================================================================

export function CampaignList({ siteId, onSelect, onCreate, className = '' }: CampaignListProps) {
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<CampaignType | ''>('');
  const [page, setPage] = useState(0);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimeout = useMemo(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return timeout;
  }, [searchTerm]);

  // Cleanup timeout
  useMemo(() => {
    return () => clearTimeout(searchTimeout);
  }, [searchTimeout]);

  // Fetch campaigns
  const { data: campaigns, isLoading, error, refetch } = useCampaigns({
    siteId,
    status: statusFilter || undefined,
    campaignType: typeFilter || undefined,
    searchTerm: debouncedSearch || undefined,
    limit: PAGE_SIZE + 1,
    offset: page * PAGE_SIZE,
  });

  // Pagination
  const hasMore = (campaigns?.length || 0) > PAGE_SIZE;
  const displayedCampaigns = campaigns?.slice(0, PAGE_SIZE) || [];

  // Handlers
  const handleStatusChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as CampaignStatus | '');
    setPage(0);
  }, []);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(e.target.value as CampaignType | '');
    setPage(0);
  }, []);

  // Error state
  if (error) {
    return (
      <Card className={className} padding="lg">
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-[#d32f2f]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-gray-600 mb-4">Failed to load campaigns</p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      {/* Header with filters */}
      <div className="p-4 border-b border-[#e0e0e0]">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <Input
              type="search"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
              className="w-36"
            />
            <Select
              value={typeFilter}
              onChange={handleTypeChange}
              options={TYPE_OPTIONS}
              className="w-32"
            />
          </div>

          {/* Create button */}
          {onCreate && (
            <Button onClick={onCreate}>
              <svg className="w-4 h-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              New Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#f5f5f5]">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Campaign</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Sent</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Delivery</th>
            </tr>
          </thead>

          {isLoading ? (
            <TableSkeleton />
          ) : displayedCampaigns.length === 0 ? (
            <tbody>
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <p className="text-gray-500 mb-4">
                    {searchTerm || statusFilter || typeFilter
                      ? 'No campaigns match your filters'
                      : 'No campaigns yet'}
                  </p>
                  {onCreate && !searchTerm && !statusFilter && !typeFilter && (
                    <Button onClick={onCreate}>Create Your First Campaign</Button>
                  )}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {displayedCampaigns.map((campaign) => (
                <CampaignRow key={campaign.id} campaign={campaign} onSelect={onSelect} />
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination */}
      {(page > 0 || hasMore) && (
        <div className="p-4 border-t border-[#e0e0e0] flex justify-between items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page + 1}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
          >
            Next
          </Button>
        </div>
      )}
    </Card>
  );
}

export default CampaignList;
