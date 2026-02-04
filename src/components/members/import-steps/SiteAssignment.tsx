import { useState, useEffect } from 'react';
import type { Site, MembershipLevel } from '@/types/member';
import { getSites, getMembershipLevels } from '@/services/members/siteService';
import { Badge } from '../../common/Badge';
import { Input } from '../../common/Input';

// =============================================================================
// Types
// =============================================================================

export interface SiteAssignmentProps {
  /** Selected site ID */
  siteId: string | null;
  /** Selected membership level ID */
  membershipLevelId: string | null;
  /** Default tags to add */
  defaultTags: string[];
  /** Called when site changes */
  onSiteChange: (siteId: string) => void;
  /** Called when membership level changes */
  onMembershipLevelChange: (levelId: string | null) => void;
  /** Called when tags change */
  onTagsChange: (tags: string[]) => void;
}

// =============================================================================
// Icons
// =============================================================================

function BuildingIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * Step 6: Site assignment - select target site and default values.
 */
export function SiteAssignment({
  siteId,
  membershipLevelId,
  defaultTags,
  onSiteChange,
  onMembershipLevelChange,
  onTagsChange,
}: SiteAssignmentProps) {
  const [sites, setSites] = useState<Site[]>([]);
  const [membershipLevels, setMembershipLevels] = useState<MembershipLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');

  // Fetch sites
  useEffect(() => {
    async function fetchSites() {
      try {
        const data = await getSites();
        setSites(data.filter((s) => s.isActive));
      } catch (err) {
        console.error('Failed to fetch sites:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSites();
  }, []);

  // Fetch membership levels when site changes
  useEffect(() => {
    if (!siteId) {
      setMembershipLevels([]);
      return;
    }

    const currentSiteId = siteId; // Capture for closure

    async function fetchLevels() {
      try {
        const data = await getMembershipLevels(currentSiteId);
        setMembershipLevels(data.filter((l) => l.isActive));
      } catch (err) {
        console.error('Failed to fetch membership levels:', err);
      }
    }
    fetchLevels();
  }, [siteId]);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !defaultTags.includes(tag)) {
      onTagsChange([...defaultTags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(defaultTags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const selectedSite = sites.find((s) => s.id === siteId);

  const getSiteLevelBadge = (level: Site['siteLevel']) => {
    const variants: Record<string, 'primary' | 'secondary' | 'default'> = {
      company: 'primary',
      region: 'secondary',
      site: 'default',
    };
    return <Badge variant={variants[level] || 'default'} size="sm">{level}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-[#003559] mb-2">Site Assignment</h2>
          <p className="text-gray-500 text-sm">Loading sites...</p>
        </div>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-[#003559] mb-2">Site Assignment</h2>
        <p className="text-gray-500 text-sm">
          Select the site to import members into and set default values.
        </p>
      </div>

      {/* Site selection */}
      <div>
        <div className="text-sm font-medium text-[#003559] mb-3 flex items-center gap-2">
          <BuildingIcon />
          Select Site
        </div>

        {sites.length === 0 ? (
          <div className="p-4 bg-[#ed6c02]/10 border border-[#ed6c02]/20 rounded-lg text-sm text-[#ed6c02]">
            No active sites found. Please create a site before importing members.
          </div>
        ) : (
          <div className="grid gap-2">
            {sites.map((site) => {
              const isSelected = siteId === site.id;

              return (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => {
                    onSiteChange(site.id);
                    onMembershipLevelChange(null);
                  }}
                  className={[
                    'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                    isSelected
                      ? 'border-[#0353a4] bg-[#b9d6f2]/10'
                      : 'border-[#e0e0e0] bg-white hover:border-[#0353a4]',
                  ].join(' ')}
                >
                  <div className={[
                    'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                    isSelected ? 'bg-[#0353a4] text-white' : 'bg-[#f5f5f5] text-gray-500',
                  ].join(' ')}>
                    <BuildingIcon />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#003559]">{site.name}</span>
                      {getSiteLevelBadge(site.siteLevel)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {site.code}
                      {site.city && site.state && ` • ${site.city}, ${site.state}`}
                    </div>
                  </div>
                  <div className={[
                    'shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                    isSelected ? 'border-[#0353a4]' : 'border-[#e0e0e0]',
                  ].join(' ')}>
                    {isSelected && (
                      <div className="w-3 h-3 rounded-full bg-[#0353a4]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Membership level selection */}
      {siteId && (
        <div>
          <div className="text-sm font-medium text-[#003559] mb-3">
            Default Membership Level
            <span className="text-gray-400 font-normal ml-1">(optional)</span>
          </div>

          {membershipLevels.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No membership levels configured for {selectedSite?.name}.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onMembershipLevelChange(null)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                  !membershipLevelId
                    ? 'bg-[#0353a4] text-white border-[#0353a4]'
                    : 'bg-white text-gray-600 border-[#e0e0e0] hover:border-[#0353a4]',
                ].join(' ')}
              >
                None
              </button>
              {membershipLevels.map((level) => {
                const isSelected = membershipLevelId === level.id;

                return (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => onMembershipLevelChange(level.id)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                      isSelected
                        ? 'bg-[#0353a4] text-white border-[#0353a4]'
                        : 'bg-white text-gray-600 border-[#e0e0e0] hover:border-[#0353a4]',
                    ].join(' ')}
                  >
                    {level.name}
                  </button>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            Applied to members without a membership level in the import data.
          </p>
        </div>
      )}

      {/* Default tags */}
      {siteId && (
        <div>
          <div className="text-sm font-medium text-[#003559] mb-3 flex items-center gap-2">
            <TagIcon />
            Default Tags
            <span className="text-gray-400 font-normal">(optional)</span>
          </div>

          <div className="flex gap-2 mb-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add a tag..."
              className="flex-1"
            />
            <button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim()}
              className={[
                'px-4 py-2 rounded-lg font-medium text-sm transition-colors',
                tagInput.trim()
                  ? 'bg-[#0353a4] text-white hover:bg-[#003559]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              ].join(' ')}
            >
              Add
            </button>
          </div>

          {defaultTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {defaultTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#b9d6f2]/30 text-[#003559] rounded text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-[#d32f2f]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 mt-2">
            These tags will be added to all imported members.
          </p>
        </div>
      )}

      {/* Summary */}
      {siteId && (
        <div className="bg-[#f5f5f5] rounded-lg p-4">
          <div className="text-sm font-medium text-[#003559] mb-2">Import Summary</div>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Site: <span className="font-medium">{selectedSite?.name}</span></li>
            {membershipLevelId && (
              <li>
                • Default Level:{' '}
                <span className="font-medium">
                  {membershipLevels.find((l) => l.id === membershipLevelId)?.name}
                </span>
              </li>
            )}
            {defaultTags.length > 0 && (
              <li>• Tags: <span className="font-medium">{defaultTags.join(', ')}</span></li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default SiteAssignment;
