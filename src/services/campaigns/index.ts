/**
 * Campaign Services
 * Exports for campaign management functionality
 */

// Services
export { campaignService } from './campaignService';
export { templateService } from './templateService';
export { messageService } from './messageService';

// React Query Hooks
export {
  // Campaign hooks
  useCampaigns,
  useCampaign,
  useCampaignMetrics,
  useCampaignRecipients,
  useCampaignMessages,
  useCreateCampaign,
  useUpdateCampaign,
  useDeleteCampaign,
  useScheduleCampaign,
  useCancelCampaign,
  useQueueCampaignMessages,
  // Template hooks
  useTemplates,
  useTemplate,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  // Message hooks
  useUpdateMessageStatus,
} from './useCampaigns';

// Re-export types for convenience
export type {
  Campaign,
  CampaignWithDetails,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignSearchParams,
  CampaignType,
  CampaignStatus,
  CampaignMetrics,
  CampaignTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  CampaignMessage,
  CampaignMessageWithMember,
  MessageStatus,
  CampaignRecipient,
  SmsValidationResult,
} from '@/types/campaign';
