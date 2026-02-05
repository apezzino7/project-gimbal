/**
 * Edit Campaign Page
 * Form to edit an existing campaign
 */

import { memo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '../components/layout';
import { CampaignForm } from '../components/campaigns';
import { useNavigation } from '../hooks/useNavigation';
import type { Campaign } from '../types/campaign';

// =============================================================================
// Component
// =============================================================================

export const EditCampaignPage = memo(function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { navItems } = useNavigation();

  const handleSuccess = useCallback(
    (campaign: Campaign) => {
      navigate(`/campaigns/${campaign.id}`);
    },
    [navigate]
  );

  const handleCancel = useCallback(() => {
    if (id) {
      navigate(`/campaigns/${id}`);
    } else {
      navigate('/campaigns');
    }
  }, [navigate, id]);

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
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#003559]">Edit Campaign</h1>
          <p className="text-gray-500 mt-1">
            Update campaign details and content
          </p>
        </div>

        {/* Campaign Form */}
        <CampaignForm
          campaignId={id}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          className="max-w-3xl"
        />
      </div>
    </AppLayout>
  );
});

export default EditCampaignPage;
