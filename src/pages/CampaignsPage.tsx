/**
 * Campaigns Page
 * List view of all campaigns with create button
 */

import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignList } from '../components/campaigns';
import { Button } from '../components/common/Button';
import { useNavigation } from '../hooks/useNavigation';

// =============================================================================
// Component
// =============================================================================

export const CampaignsPage = memo(function CampaignsPage() {
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleCreateCampaign = useCallback(() => {
    navigate('/campaigns/new');
  }, [navigate]);

  const handleSelectCampaign = useCallback(
    (campaignId: string) => {
      navigate(`/campaigns/${campaignId}`);
    },
    [navigate]
  );

  return (
    <AppLayout navItems={navItems}>
      <div className="p-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#003559]">Campaigns</h1>
            <p className="text-gray-500 mt-1">
              Create and manage SMS and email marketing campaigns
            </p>
          </div>
          <Button onClick={handleCreateCampaign}>
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Campaign
          </Button>
        </div>

        {/* Campaign List */}
        <CampaignList
          onSelect={handleSelectCampaign}
          onCreate={handleCreateCampaign}
        />
      </div>
    </AppLayout>
  );
});

export default CampaignsPage;
