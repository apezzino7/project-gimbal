import { useState, useEffect, useCallback, useMemo } from 'react';
import type { Site, SiteWithHierarchy, SiteLevel } from '@/types/member';
import { getSites, getSiteHierarchy } from '@/services/members/siteService';

// =============================================================================
// Types
// =============================================================================

export interface SiteSelectorProps {
  /** Selected site ID */
  value?: string | null;
  /** Called when selection changes */
  onChange?: (siteId: string | null, site: Site | null) => void;
  /** Filter by site level */
  siteLevel?: SiteLevel | SiteLevel[];
  /** Show "All Sites" option */
  showAllOption?: boolean;
  /** Label for "All Sites" option */
  allOptionLabel?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show hierarchy indentation */
  showHierarchy?: boolean;
  /** Label text */
  label?: string;
  /** Required field */
  required?: boolean;
}

// =============================================================================
// Styles
// =============================================================================

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm min-h-[32px]',
  md: 'px-4 py-2 text-base min-h-[40px]',
  lg: 'px-4 py-3 text-lg min-h-[48px]',
};

// =============================================================================
// Component
// =============================================================================

/**
 * Site selector dropdown component with hierarchy support.
 *
 * @example
 * <SiteSelector
 *   value={selectedSiteId}
 *   onChange={(id, site) => setSelectedSite(site)}
 *   showAllOption
 * />
 *
 * @example
 * // Filter by site level
 * <SiteSelector
 *   siteLevel="site"
 *   label="Select Location"
 *   required
 * />
 */
export function SiteSelector({
  value,
  onChange,
  siteLevel,
  showAllOption = false,
  allOptionLabel = 'All Sites',
  placeholder = 'Select a site...',
  disabled = false,
  error,
  className = '',
  size = 'md',
  showHierarchy = true,
  label,
  required = false,
}: SiteSelectorProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [hierarchy, setHierarchy] = useState<SiteWithHierarchy[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch sites on mount
  useEffect(() => {
    async function fetchSites() {
      try {
        setLoading(true);
        const [allSites, siteTree] = await Promise.all([
          getSites(),
          showHierarchy ? getSiteHierarchy() : Promise.resolve([]),
        ]);
        setSites(allSites.filter(s => s.isActive));
        setHierarchy(siteTree);
      } catch (err) {
        console.error('Failed to fetch sites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, [showHierarchy]);

  // Filter sites by level if specified
  const filteredSites = useMemo(() => {
    if (!siteLevel) return sites;
    const levels = Array.isArray(siteLevel) ? siteLevel : [siteLevel];
    return sites.filter(s => levels.includes(s.siteLevel));
  }, [sites, siteLevel]);

  // Build flat list with hierarchy indentation
  const siteOptions = useMemo(() => {
    if (!showHierarchy || hierarchy.length === 0) {
      return filteredSites.map(s => ({ site: s, depth: 0 }));
    }

    const options: Array<{ site: Site; depth: number }> = [];

    function traverse(nodes: SiteWithHierarchy[], depth: number) {
      for (const node of nodes) {
        const matchesLevel = !siteLevel ||
          (Array.isArray(siteLevel) ? siteLevel.includes(node.siteLevel) : siteLevel === node.siteLevel);

        if (matchesLevel && node.isActive) {
          options.push({ site: node, depth });
        }

        if (node.children && node.children.length > 0) {
          traverse(node.children, depth + 1);
        }
      }
    }

    traverse(hierarchy, 0);
    return options;
  }, [filteredSites, hierarchy, showHierarchy, siteLevel]);

  // Handle selection change
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value || null;
      const selectedSite = selectedId ? sites.find(s => s.id === selectedId) || null : null;
      onChange?.(selectedId, selectedSite);
    },
    [sites, onChange]
  );

  // Get level icon
  const getLevelIcon = (level: SiteLevel) => {
    switch (level) {
      case 'company':
        return '🏢';
      case 'region':
        return '📍';
      case 'site':
        return '🏪';
      default:
        return '';
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-[#003559] mb-1.5">
          {label}
          {required && <span className="text-[#d32f2f] ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          value={value || ''}
          onChange={handleChange}
          disabled={disabled || loading}
          required={required}
          className={[
            'w-full rounded-lg border bg-white',
            'transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-[#0353a4] focus:border-[#0353a4]',
            error
              ? 'border-[#d32f2f] focus:ring-[#d32f2f] focus:border-[#d32f2f]'
              : 'border-[#e0e0e0] hover:border-[#b9d6f2]',
            disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'cursor-pointer',
            sizeStyles[size],
            'appearance-none pr-10',
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? 'site-selector-error' : undefined}
        >
          {loading ? (
            <option value="">Loading sites...</option>
          ) : (
            <>
              {showAllOption && <option value="">{allOptionLabel}</option>}
              {!showAllOption && !value && <option value="">{placeholder}</option>}

              {siteOptions.map(({ site, depth }) => (
                <option key={site.id} value={site.id}>
                  {showHierarchy && depth > 0 ? '│ '.repeat(depth) + '└ ' : ''}
                  {getLevelIcon(site.siteLevel)} {site.name}
                  {site.code ? ` (${site.code})` : ''}
                </option>
              ))}
            </>
          )}
        </select>

        {/* Dropdown arrow */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>

      {error && (
        <p id="site-selector-error" className="mt-1.5 text-sm text-[#d32f2f]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default SiteSelector;
