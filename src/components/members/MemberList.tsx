import { useState, useEffect, useCallback, useMemo } from 'react';
import type { MemberSearchResult, MembershipStatus } from '@/types/member';
import { searchMembers } from '@/services/members/memberService';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { SiteSelector } from './SiteSelector';

// =============================================================================
// Types
// =============================================================================

export interface MemberListProps {
  /** Filter by site ID */
  siteId?: string;
  /** Called when a member is selected */
  onSelect?: (memberId: string) => void;
  /** Called when add button is clicked */
  onAdd?: () => void;
  /** Called when import button is clicked */
  onImport?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const STATUS_OPTIONS: Array<{ value: MembershipStatus | ''; label: string }> = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

const ITEMS_PER_PAGE = 25;

// =============================================================================
// Sub-components
// =============================================================================

interface MemberRowProps {
  member: MemberSearchResult;
  onSelect?: (memberId: string) => void;
}

function MemberRow({ member, onSelect }: MemberRowProps) {
  const statusBadge = useMemo(() => {
    const variants: Record<MembershipStatus, 'success' | 'warning' | 'danger' | 'default' | 'secondary'> = {
      active: 'success',
      expired: 'warning',
      cancelled: 'danger',
      suspended: 'danger',
      pending: 'default',
    };
    return (
      <Badge variant={variants[member.membershipStatus]} size="sm">
        {member.membershipStatus}
      </Badge>
    );
  }, [member.membershipStatus]);

  const fullName = [member.firstName, member.lastName].filter(Boolean).join(' ') || 'Unnamed';

  return (
    <tr
      className="hover:bg-[#f5f5f5] transition-colors cursor-pointer"
      onClick={() => onSelect?.(member.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(member.id);
        }
      }}
    >
      <td className="px-4 py-3 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-10 h-10 bg-[#f5f5f5] rounded-full flex items-center justify-center">
            <UserIcon />
          </div>
          <div>
            <div className="font-medium text-[#003559]">{fullName}</div>
            <div className="text-sm text-gray-500">{member.email || 'No email'}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {member.phone || '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {statusBadge}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {member.membershipLevelName || '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[#2e7d32]">
        ${member.lifetimeValue.toLocaleString()}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
        {member.totalVisits}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {member.lastVisitAt
          ? new Date(member.lastVisitAt).toLocaleDateString()
          : 'Never'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
        {member.siteName}
      </td>
    </tr>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Member list with search, filtering, and pagination.
 *
 * @example
 * <MemberList
 *   onSelect={(id) => navigate(`/members/${id}`)}
 *   onAdd={() => openAddModal()}
 *   onImport={() => navigate('/members/import')}
 * />
 */
export function MemberList({
  siteId: initialSiteId,
  onSelect,
  onAdd,
  onImport,
  className = '',
}: MemberListProps) {
  const [members, setMembers] = useState<MemberSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [siteId, setSiteId] = useState<string | null>(initialSiteId || null);
  const [status, setStatus] = useState<MembershipStatus | ''>('');

  // Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, siteId, status]);

  // Fetch members
  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoading(true);
        setError(null);

        const results = await searchMembers({
          siteId: siteId || undefined,
          searchTerm: debouncedSearch || undefined,
          membershipStatus: status || undefined,
          limit: ITEMS_PER_PAGE + 1, // Fetch one extra to check if there's more
          offset: page * ITEMS_PER_PAGE,
        });

        // Check if there are more results
        if (results.length > ITEMS_PER_PAGE) {
          setHasMore(true);
          setMembers(results.slice(0, ITEMS_PER_PAGE));
        } else {
          setHasMore(false);
          setMembers(results);
        }
      } catch (err) {
        console.error('Failed to fetch members:', err);
        setError('Failed to load members. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();
  }, [debouncedSearch, siteId, status, page]);

  // Handle page change
  const handleNextPage = useCallback(() => {
    if (hasMore) setPage((p) => p + 1);
  }, [hasMore]);

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  // Render table
  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Member
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Phone
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Level
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              LTV
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Visits
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Last Visit
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-[#003559] uppercase tracking-wider">
              Site
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#e0e0e0]">
          {members.map((member) => (
            <MemberRow key={member.id} member={member} onSelect={onSelect} />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <Card className={className} padding="none">
      <CardHeader
        actions={
          <div className="flex items-center gap-2">
            {onImport && (
              <Button variant="outline" size="sm" onClick={onImport} leftIcon={<UploadIcon />}>
                Import
              </Button>
            )}
            {onAdd && (
              <Button size="sm" onClick={onAdd} leftIcon={<PlusIcon />}>
                Add Member
              </Button>
            )}
          </div>
        }
      >
        Members
      </CardHeader>

      {/* Filters */}
      <div className="p-4 border-b border-[#e0e0e0] bg-[#f5f5f5]/50">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <SearchIcon />
              </div>
              <Input
                type="search"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <SiteSelector
            value={siteId}
            onChange={(id) => setSiteId(id)}
            showAllOption
            allOptionLabel="All Sites"
            className="min-w-[180px]"
            size="md"
          />

          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value as MembershipStatus | '')}
            className="min-w-[150px]"
            options={STATUS_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>
      </div>

      {/* Content */}
      {loading && page === 0 ? (
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-48 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-8">
          <EmptyState
            title="Error Loading Members"
            description={error}
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        </div>
      ) : members.length === 0 ? (
        <div className="p-8">
          <EmptyState
            title={debouncedSearch || status ? 'No Members Found' : 'No Members Yet'}
            description={
              debouncedSearch || status
                ? 'Try adjusting your search or filters.'
                : 'Import members or add them manually to get started.'
            }
            action={
              !debouncedSearch && !status && onImport
                ? { label: 'Import Members', onClick: onImport }
                : undefined
            }
          />
        </div>
      ) : (
        <>
          {renderTable()}

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-[#e0e0e0] flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {page * ITEMS_PER_PAGE + 1} -{' '}
              {page * ITEMS_PER_PAGE + members.length}
              {hasMore && '+'}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevPage}
                disabled={page === 0 || loading}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNextPage}
                disabled={!hasMore || loading}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default MemberList;
