import { useState, useEffect, useCallback } from 'react';
import type { SiteWithHierarchy, SiteStats } from '@/types/member';
import { getSiteHierarchy, getSiteStats } from '@/services/members/siteService';
import { Card, CardHeader } from '../common/Card';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';

// =============================================================================
// Types
// =============================================================================

export interface SiteListProps {
  /** Called when a site is selected */
  onSelect?: (siteId: string) => void;
  /** Called when edit button is clicked */
  onEdit?: (siteId: string) => void;
  /** Called when add button is clicked */
  onAdd?: () => void;
  /** Show stats for each site */
  showStats?: boolean;
  /** Additional class names */
  className?: string;
}

interface SiteItemProps {
  site: SiteWithHierarchy;
  depth: number;
  stats?: SiteStats;
  showStats: boolean;
  onSelect?: (siteId: string) => void;
  onEdit?: (siteId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

// =============================================================================
// Icons
// =============================================================================

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      className={[
        'w-4 h-4 text-gray-400 transition-transform duration-200',
        expanded ? 'rotate-90' : '',
      ].join(' ')}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function StoreIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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

// =============================================================================
// Sub-components
// =============================================================================

function SiteItem({
  site,
  depth,
  stats,
  showStats,
  onSelect,
  onEdit,
  isExpanded,
  onToggle,
}: SiteItemProps) {
  const hasChildren = site.children && site.children.length > 0;

  const getLevelIcon = () => {
    switch (site.siteLevel) {
      case 'company':
        return <BuildingIcon />;
      case 'region':
        return <MapPinIcon />;
      default:
        return <StoreIcon />;
    }
  };

  const getLevelBadge = () => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'secondary'> = {
      company: 'primary',
      region: 'secondary',
      site: 'default',
    };
    return (
      <Badge variant={variants[site.siteLevel] || 'default'} size="sm">
        {site.siteLevel}
      </Badge>
    );
  };

  return (
    <div className="border-b border-[#e0e0e0] last:border-b-0">
      <div
        className={[
          'flex items-center gap-3 p-4',
          'hover:bg-[#f5f5f5] transition-colors duration-200',
          onSelect ? 'cursor-pointer' : '',
        ].join(' ')}
        onClick={() => onSelect?.(site.id)}
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        onKeyDown={(e) => {
          if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onSelect(site.id);
          }
        }}
      >
        {/* Indentation */}
        {depth > 0 && (
          <div style={{ width: depth * 24 }} className="shrink-0" aria-hidden="true" />
        )}

        {/* Expand/collapse button */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="shrink-0 p-1 hover:bg-[#b9d6f2]/30 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            aria-expanded={isExpanded}
          >
            <ChevronIcon expanded={isExpanded} />
          </button>
        ) : (
          <div className="w-6" aria-hidden="true" />
        )}

        {/* Icon */}
        <div className="shrink-0 text-[#0353a4]">{getLevelIcon()}</div>

        {/* Site info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#003559] truncate">{site.name}</span>
            {getLevelBadge()}
            {!site.isActive && (
              <Badge variant="danger" size="sm">
                Inactive
              </Badge>
            )}
          </div>
          <div className="text-sm text-gray-500 truncate">
            {site.code}
            {site.city && site.state && ` • ${site.city}, ${site.state}`}
          </div>
        </div>

        {/* Stats */}
        {showStats && stats && (
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="font-semibold text-[#003559]">{stats.activeMembers}</div>
              <div className="text-gray-500 text-xs">Members</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-[#2e7d32]">
                ${stats.totalRevenue.toLocaleString()}
              </div>
              <div className="text-gray-500 text-xs">Revenue</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-[#0353a4]">${stats.avgLtv.toFixed(0)}</div>
              <div className="text-gray-500 text-xs">Avg LTV</div>
            </div>
          </div>
        )}

        {/* Edit button */}
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(site.id);
            }}
            aria-label={`Edit ${site.name}`}
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Site list component with hierarchy display.
 *
 * @example
 * <SiteList
 *   onSelect={(id) => navigate(`/sites/${id}`)}
 *   onEdit={(id) => openEditModal(id)}
 *   onAdd={() => openAddModal()}
 *   showStats
 * />
 */
export function SiteList({
  onSelect,
  onEdit,
  onAdd,
  showStats = false,
  className = '',
}: SiteListProps) {
  const [hierarchy, setHierarchy] = useState<SiteWithHierarchy[]>([]);
  const [siteStats, setSiteStats] = useState<Record<string, SiteStats>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch hierarchy
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);
        const data = await getSiteHierarchy();
        setHierarchy(data);

        // Expand top-level by default
        const topLevelIds = new Set(data.map(s => s.id));
        setExpanded(topLevelIds);
      } catch (err) {
        console.error('Failed to fetch sites:', err);
        setError('Failed to load sites. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Fetch stats for visible sites
  useEffect(() => {
    if (!showStats || hierarchy.length === 0) return;

    async function fetchStats() {
      const stats: Record<string, SiteStats> = {};

      // Collect all site IDs
      function collectIds(sites: SiteWithHierarchy[]): string[] {
        const ids: string[] = [];
        for (const site of sites) {
          ids.push(site.id);
          if (site.children) {
            ids.push(...collectIds(site.children));
          }
        }
        return ids;
      }

      const allIds = collectIds(hierarchy);

      // Fetch stats for each (could be optimized with a batch RPC)
      await Promise.all(
        allIds.map(async (id) => {
          try {
            stats[id] = await getSiteStats(id, true);
          } catch (err) {
            console.error(`Failed to fetch stats for site ${id}:`, err);
          }
        })
      );

      setSiteStats(stats);
    }

    fetchStats();
  }, [hierarchy, showStats]);

  // Toggle expanded state
  const toggleExpanded = useCallback((siteId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(siteId)) {
        next.delete(siteId);
      } else {
        next.add(siteId);
      }
      return next;
    });
  }, []);

  // Render site tree recursively
  const renderSites = (sites: SiteWithHierarchy[], depth = 0): React.ReactNode[] => {
    const items: React.ReactNode[] = [];

    for (const site of sites) {
      const isExpanded = expanded.has(site.id);

      items.push(
        <SiteItem
          key={site.id}
          site={site}
          depth={depth}
          stats={siteStats[site.id]}
          showStats={showStats}
          onSelect={onSelect}
          onEdit={onEdit}
          isExpanded={isExpanded}
          onToggle={() => toggleExpanded(site.id)}
        />
      );

      // Render children if expanded
      if (isExpanded && site.children && site.children.length > 0) {
        items.push(...renderSites(site.children, depth + 1));
      }
    }

    return items;
  };

  // Loading state
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader actions={onAdd && <Button disabled leftIcon={<PlusIcon />}>Add Site</Button>}>
          Sites
        </CardHeader>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-6 h-6 bg-gray-200 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>Sites</CardHeader>
        <div className="p-8">
          <EmptyState
            title="Error Loading Sites"
            description={error}
            action={{ label: 'Retry', onClick: () => window.location.reload() }}
          />
        </div>
      </Card>
    );
  }

  // Empty state
  if (hierarchy.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>Sites</CardHeader>
        <div className="p-8">
          <EmptyState
            title="No Sites Yet"
            description="Create your first site to get started managing members."
            action={onAdd ? { label: 'Add Site', onClick: onAdd } : undefined}
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="none">
      <CardHeader
        actions={
          onAdd && (
            <Button onClick={onAdd} size="sm" leftIcon={<PlusIcon />}>
              Add Site
            </Button>
          )
        }
      >
        Sites
      </CardHeader>
      <div className="divide-y divide-[#e0e0e0]">{renderSites(hierarchy)}</div>
    </Card>
  );
}

export default SiteList;
