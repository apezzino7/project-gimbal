/**
 * Campaign Detail Page
 * View campaign details, metrics, and message tracking
 */

import { memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignDetail } from '../components/campaigns';
import { useNavigation } from '../hooks/useNavigation';
import type { Campaign } from '../types/campaign';

// =============================================================================
// Component
// =============================================================================

export const CampaignDetailPage = memo(function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleBack = useCallback(() => {
    navigate('/campaigns');
  }, [navigate]);

  const handleEdit = useCallback(
    (campaign: Campaign) => {
      navigate(`/campaigns/${campaign.id}/edit`);
    },
    [navigate]
  );

  if (!id) {
    return (
      <AppLayout navItems={navItems}>
        <div className="p-6">
          <div className="text-center py-12">
            <p className="text-[#d32f2f]">Campaign ID is required</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout navItems={navItems}>
      <div className="p-6">
        <CampaignDetail
          campaignId={id}
          onBack={handleBack}
          onEdit={handleEdit}
        />
      </div>
    </AppLayout>
  );
});

export default CampaignDetailPage;
