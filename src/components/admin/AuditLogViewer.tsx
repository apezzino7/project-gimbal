/**
 * AuditLogViewer Component
 * Displays and filters audit log entries
 */

import { useState, useMemo, useCallback } from 'react';
import type { AuditLog } from '@/types/admin';
import { AUDIT_EVENT_CATEGORIES } from '@/types/admin';
import { useAuditLogs, useAuditLogStats, useAuditEventTypes } from '@/hooks/useProfile';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

// =============================================================================
// Types
// =============================================================================

export interface AuditLogViewerProps {
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 50;

// Get event variant based on category
function getEventVariant(eventType: string): 'default' | 'success' | 'warning' | 'danger' | 'primary' {
  if (eventType.includes('FAILED') || eventType.includes('ERROR') || eventType.includes('LOCKED')) {
    return 'danger';
  }
  if (eventType.includes('SUCCESS') || eventType.includes('CREATED') || eventType.includes('ACTIVATED')) {
    return 'success';
  }
  if (eventType.includes('SENT') || eventType.includes('DELIVERED')) {
    return 'primary';
  }
  if (eventType.includes('DELETED') || eventType.includes('DEACTIVATED') || eventType.includes('CANCELLED')) {
    return 'warning';
  }
  return 'default';
}

// Format relative time
function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

// =============================================================================
// Sub-components
// =============================================================================

interface AuditLogRowProps {
  log: AuditLog;
}

function AuditLogRow({ log }: AuditLogRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#e0e0e0] last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-4 hover:bg-[#f5f5f5] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={getEventVariant(log.eventType)} size="sm">
              {log.eventType}
            </Badge>
            <span className="text-sm text-gray-500">
              {formatRelativeTime(log.createdAt)}
            </span>
          </div>
          <div className="text-sm text-gray-600 truncate">
            {log.email || 'System'}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-[#f5f5f5]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Timestamp</span>
              <div className="font-mono">
                {new Date(log.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <span className="text-gray-500">IP Address</span>
              <div className="font-mono">{log.ipAddress || 'N/A'}</div>
            </div>
            {log.userAgent && (
              <div className="col-span-2">
                <span className="text-gray-500">User Agent</span>
                <div className="font-mono text-xs truncate">{log.userAgent}</div>
              </div>
            )}
            {Object.keys(log.metadata).length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">Metadata</span>
                <pre className="mt-1 p-2 bg-white rounded border border-[#e0e0e0] text-xs overflow-auto max-h-40">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatsCardProps {
  label: string;
  value: number;
  color?: string;
}

function StatsCard({ label, value, color = 'text-[#003559]' }: StatsCardProps) {
  return (
    <div className="bg-white rounded-lg border border-[#e0e0e0] px-4 py-3">
      <div className="text-sm text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold ${color}`}>{value.toLocaleString()}</div>
    </div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AuditLogViewer({ className = '' }: AuditLogViewerProps) {
  const [search, setSearch] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [page, setPage] = useState(0);

  // Build search params
  const searchParams = useMemo(
    () => ({
      search: search || undefined,
      eventType: eventTypeFilter || undefined,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    }),
    [search, eventTypeFilter, page]
  );

  // Fetch data
  const { data: logs = [], isLoading, error } = useAuditLogs(searchParams);
  const { data: stats } = useAuditLogStats(7);
  const { data: eventTypes = [] } = useAuditEventTypes();

  // Handle search change
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(0);
    },
    []
  );

  // Handle event type filter
  const handleEventTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setEventTypeFilter(e.target.value);
      setPage(0);
    },
    []
  );

  // Group event types by category for the filter dropdown
  const eventTypeOptions = useMemo(() => {
    const options: Array<{ value: string; label: string; group?: string }> = [
      { value: '', label: 'All Events' },
    ];

    // Add known categories
    Object.entries(AUDIT_EVENT_CATEGORIES).forEach(([category, events]) => {
      events.forEach((event) => {
        if (eventTypes.includes(event)) {
          options.push({ value: event, label: event, group: category });
        }
      });
    });

    // Add unknown events
    eventTypes.forEach((type) => {
      const isKnown = Object.values(AUDIT_EVENT_CATEGORIES).flat().includes(type);
      if (!isKnown) {
        options.push({ value: type, label: type, group: 'Other' });
      }
    });

    return options;
  }, [eventTypes]);

  // Calculate stats by type for the last 7 days
  const topEventTypes = useMemo(() => {
    if (!stats?.eventsByType) return [];
    return Object.entries(stats.eventsByType)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }, [stats]);

  // Loading state
  if (isLoading && !logs.length) {
    return (
      <Card className={className}>
        <CardHeader>Audit Log</CardHeader>
        <div className="p-8 text-center text-gray-500">Loading audit logs...</div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>Audit Log</CardHeader>
        <div className="p-8 text-center text-[#d32f2f]">
          Failed to load audit logs. Please try again.
        </div>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard label="Events (7 days)" value={stats.totalEvents} />
          {topEventTypes.slice(0, 3).map(({ type, count }) => (
            <StatsCard
              key={type}
              label={type.replace(/_/g, ' ')}
              value={count}
              color={
                type.includes('FAILED')
                  ? 'text-[#d32f2f]'
                  : type.includes('SUCCESS')
                  ? 'text-[#2e7d32]'
                  : 'text-[#0353a4]'
              }
            />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>Audit Log</CardHeader>

        {/* Filters */}
        <div className="p-4 border-b border-[#e0e0e0]">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <SearchIcon />
              </span>
              <Input
                type="search"
                placeholder="Search by email or event..."
                value={search}
                onChange={handleSearchChange}
                className="pl-10"
                aria-label="Search audit logs"
              />
            </div>

            {/* Event Type Filter */}
            <Select
              value={eventTypeFilter}
              onChange={handleEventTypeChange}
              aria-label="Filter by event type"
              className="md:w-64"
              options={eventTypeOptions}
            />
          </div>
        </div>

        {/* Log List */}
        {logs.length === 0 ? (
          <EmptyState
            icon={<ClipboardIcon />}
            title="No audit logs found"
            description={
              search || eventTypeFilter
                ? 'Try adjusting your search or filters'
                : 'Audit events will appear here as they occur'
            }
          />
        ) : (
          <>
            <div className="divide-y divide-[#e0e0e0]">
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </div>

            {/* Pagination */}
            {logs.length >= ITEMS_PER_PAGE && (
              <div className="p-4 border-t border-[#e0e0e0] flex justify-between items-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">Page {page + 1}</span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={logs.length < ITEMS_PER_PAGE}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default AuditLogViewer;
