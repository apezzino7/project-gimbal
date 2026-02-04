/**
 * Campaign Form
 * Create/edit campaign with Zod validation
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../common/Button';
import { Input } from '../common/Input';
import { Textarea } from '../common/Textarea';
import { Select } from '../common/Select';
import { Card } from '../common/Card';
import { TemplateSelector } from './TemplateSelector';
import { ContentEditor } from './ContentEditor';
import { SiteSelector } from '../members/SiteSelector';
import { useCreateCampaign, useUpdateCampaign, useCampaign } from '@/services/campaigns';
import type { Campaign, CampaignType, CampaignTemplate } from '@/types/campaign';

// =============================================================================
// Types
// =============================================================================

export interface CampaignFormProps {
  campaignId?: string;
  campaignType?: CampaignType;
  siteId?: string;
  onSuccess?: (campaign: Campaign) => void;
  onCancel?: () => void;
  className?: string;
}

// =============================================================================
// Validation Schema
// =============================================================================

const campaignSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
    description: z.string().max(500).optional().nullable(),
    campaignType: z.enum(['sms', 'email']),
    siteId: z.string().optional().nullable(),
    templateId: z.string().optional().nullable(),
    subject: z.string().max(255).optional().nullable(),
    content: z.string().min(1, 'Message content is required'),
    scheduledAt: z.string().optional().nullable(),
    targetAllMembers: z.boolean(),
    membershipStatuses: z.array(z.string()),
  })
  .refine(
    (data) => {
      // Email requires subject
      if (data.campaignType === 'email' && !data.subject) {
        return false;
      }
      return true;
    },
    {
      message: 'Subject is required for email campaigns',
      path: ['subject'],
    }
  );

type CampaignFormData = z.infer<typeof campaignSchema>;

// =============================================================================
// Constants
// =============================================================================

const TYPE_OPTIONS = [
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'expired', label: 'Expired' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'pending', label: 'Pending' },
];

// =============================================================================
// Component
// =============================================================================

export function CampaignForm({
  campaignId,
  campaignType: defaultType,
  siteId: defaultSiteId,
  onSuccess,
  onCancel,
  className = '',
}: CampaignFormProps) {
  const isEdit = !!campaignId;
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch existing campaign if editing
  const { data: existingCampaign, isLoading: loadingCampaign } = useCampaign(campaignId || '');

  // Mutations
  const createMutation = useCreateCampaign();
  const updateMutation = useUpdateCampaign();

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      description: '',
      campaignType: defaultType || 'email',
      siteId: defaultSiteId || null,
      templateId: null,
      subject: '',
      content: '',
      scheduledAt: null,
      targetAllMembers: false,
      membershipStatuses: ['active'],
    },
  });

  // Watch campaign type for conditional rendering
  const watchedType = watch('campaignType');
  const watchedContent = watch('content');

  // Populate form when editing
  useEffect(() => {
    if (existingCampaign && isEdit) {
      reset({
        name: existingCampaign.name,
        description: existingCampaign.description || '',
        campaignType: existingCampaign.campaignType,
        siteId: existingCampaign.siteId || null,
        templateId: existingCampaign.templateId || null,
        subject: existingCampaign.subject || '',
        content: existingCampaign.content,
        scheduledAt: existingCampaign.scheduledAt || null,
        targetAllMembers: existingCampaign.targetAllMembers,
        membershipStatuses: existingCampaign.membershipStatuses,
      });
    }
  }, [existingCampaign, isEdit, reset]);

  // Handle template selection
  const handleTemplateSelect = useCallback(
    (templateId: string | null, template?: CampaignTemplate) => {
      setValue('templateId', templateId, { shouldDirty: true });
      if (template) {
        setValue('content', template.content, { shouldDirty: true });
        if (template.subject && watchedType === 'email') {
          setValue('subject', template.subject, { shouldDirty: true });
        }
      }
    },
    [setValue, watchedType]
  );

  // Handle site selection
  const handleSiteChange = useCallback(
    (siteId: string | null) => {
      setValue('siteId', siteId, { shouldDirty: true });
    },
    [setValue]
  );

  // Submit handler
  const onSubmit = async (data: CampaignFormData) => {
    setSubmitError(null);

    try {
      let result: Campaign;

      if (isEdit && campaignId) {
        result = await updateMutation.mutateAsync({
          id: campaignId,
          input: {
            name: data.name,
            description: data.description || null,
            siteId: data.siteId || null,
            templateId: data.templateId || null,
            subject: data.subject || null,
            content: data.content,
            scheduledAt: data.scheduledAt || null,
            targetAllMembers: data.targetAllMembers,
            membershipStatuses: data.membershipStatuses,
          },
        });
      } else {
        result = await createMutation.mutateAsync({
          name: data.name,
          description: data.description || null,
          campaignType: data.campaignType,
          siteId: data.siteId || null,
          templateId: data.templateId || null,
          subject: data.subject || null,
          content: data.content,
          scheduledAt: data.scheduledAt || null,
          targetAllMembers: data.targetAllMembers,
          membershipStatuses: data.membershipStatuses,
        });
      }

      onSuccess?.(result);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save campaign');
    }
  };

  if (loadingCampaign && isEdit) {
    return (
      <Card className={className} padding="lg">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card className={className} padding="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-xl font-semibold text-[#003559]">
            {isEdit ? 'Edit Campaign' : 'Create Campaign'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? 'Update campaign details and content'
              : 'Set up your campaign details and message'}
          </p>
        </div>

        {/* Error display */}
        {submitError && (
          <div
            className="p-4 bg-[#d32f2f]/10 border border-[#d32f2f]/20 rounded-lg text-[#d32f2f] text-sm"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 border-b border-[#e0e0e0] pb-2">
            Basic Information
          </h3>

          {/* Campaign Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name *
            </label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Welcome Series - New Members"
              error={errors.name?.message}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the campaign purpose"
              rows={2}
              error={errors.description?.message}
            />
          </div>

          {/* Campaign Type (only for create) */}
          {!isEdit && (
            <div>
              <label htmlFor="campaignType" className="block text-sm font-medium text-gray-700 mb-1">
                Campaign Type *
              </label>
              <Select
                id="campaignType"
                {...register('campaignType')}
                options={TYPE_OPTIONS}
                error={errors.campaignType?.message}
              />
            </div>
          )}

          {/* Site */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Target Site
            </label>
            <SiteSelector
              value={watch('siteId') || null}
              onChange={handleSiteChange}
              placeholder="All sites"
              showAllOption
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to target members from all sites
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 border-b border-[#e0e0e0] pb-2">
            Message Content
          </h3>

          {/* Template Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start from Template
            </label>
            <TemplateSelector
              value={watch('templateId') || null}
              onChange={handleTemplateSelect}
              type={watchedType}
              placeholder="Select a template (optional)"
            />
          </div>

          {/* Subject (Email only) */}
          {watchedType === 'email' && (
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
                Subject Line *
              </label>
              <Input
                id="subject"
                {...register('subject')}
                placeholder="Enter email subject"
                error={errors.subject?.message}
              />
            </div>
          )}

          {/* Content Editor */}
          <ContentEditor
            value={watchedContent}
            onChange={(value) => setValue('content', value, { shouldDirty: true })}
            type={watchedType}
            error={errors.content?.message}
          />
        </div>

        {/* Targeting Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700 border-b border-[#e0e0e0] pb-2">
            Audience Targeting
          </h3>

          {/* Target all members toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="targetAllMembers"
              {...register('targetAllMembers')}
              className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
            />
            <label htmlFor="targetAllMembers" className="text-sm text-gray-700">
              Send to all eligible members
            </label>
          </div>

          {/* Membership status filter */}
          {!watch('targetAllMembers') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Membership Status
              </label>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <label
                    key={status.value}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e0e0e0] rounded-full cursor-pointer hover:bg-[#f5f5f5] transition-colors"
                  >
                    <input
                      type="checkbox"
                      value={status.value}
                      checked={watch('membershipStatuses')?.includes(status.value)}
                      onChange={(e) => {
                        const current = watch('membershipStatuses') || [];
                        if (e.target.checked) {
                          setValue('membershipStatuses', [...current, status.value], {
                            shouldDirty: true,
                          });
                        } else {
                          setValue(
                            'membershipStatuses',
                            current.filter((s) => s !== status.value),
                            { shouldDirty: true }
                          );
                        }
                      }}
                      className="rounded border-[#e0e0e0] text-[#0353a4] focus:ring-[#0353a4]"
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[#e0e0e0]">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" loading={isSubmitting} disabled={!isDirty && isEdit}>
            {isEdit ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default CampaignForm;
