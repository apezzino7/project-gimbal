/**
 * Campaign React Query Hooks
 * Hooks for fetching and mutating campaign data
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignKeys, templateKeys } from '@/lib/queryKeys';
import { campaignService } from './campaignService';
import { templateService } from './templateService';
import { messageService } from './messageService';
import type {
  CampaignSearchParams,
  CreateCampaignInput,
  UpdateCampaignInput,
  CampaignType,
  CreateTemplateInput,
  UpdateTemplateInput,
  MessageStatus,
} from '@/types/campaign';

// =============================================================================
// Campaign Hooks
// =============================================================================

/**
 * Fetch campaigns list
 */
export function useCampaigns(filters?: CampaignSearchParams) {
  return useQuery({
    queryKey: campaignKeys.list(filters),
    queryFn: () => campaignService.getCampaigns(filters),
  });
}

/**
 * Fetch a single campaign with details
 */
export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => campaignService.getCampaignWithDetails(id),
    enabled: !!id,
  });
}

/**
 * Fetch campaign metrics
 */
export function useCampaignMetrics(id: string) {
  return useQuery({
    queryKey: campaignKeys.metrics(id),
    queryFn: () => campaignService.getCampaignMetrics(id),
    enabled: !!id,
  });
}

/**
 * Fetch campaign recipients
 */
export function useCampaignRecipients(id: string) {
  return useQuery({
    queryKey: [...campaignKeys.detail(id), 'recipients'],
    queryFn: () => campaignService.getCampaignRecipients(id),
    enabled: !!id,
  });
}

/**
 * Fetch campaign messages
 */
export function useCampaignMessages(id: string, params?: { status?: MessageStatus; limit?: number }) {
  return useQuery({
    queryKey: campaignKeys.messages(id),
    queryFn: () => messageService.getCampaignMessages(id, params),
    enabled: !!id,
  });
}

/**
 * Create a new campaign
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCampaignInput) => campaignService.createCampaign(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

/**
 * Update a campaign
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCampaignInput }) =>
      campaignService.updateCampaign(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

/**
 * Delete a campaign
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignService.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

/**
 * Schedule a campaign
 */
export function useScheduleCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      campaignService.scheduleCampaign(id, scheduledAt),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

/**
 * Cancel a campaign
 */
export function useCancelCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => campaignService.cancelCampaign(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.lists() });
    },
  });
}

/**
 * Queue messages for a campaign
 */
export function useQueueCampaignMessages() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaignId: string) => campaignService.queueCampaignMessages(campaignId),
    onSuccess: (_, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.messages(campaignId) });
    },
  });
}

// =============================================================================
// Template Hooks
// =============================================================================

/**
 * Fetch templates list
 */
export function useTemplates(type?: CampaignType) {
  return useQuery({
    queryKey: templateKeys.list(type),
    queryFn: () => templateService.getTemplates(type),
  });
}

/**
 * Fetch a single template
 */
export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templateService.getTemplateById(id),
    enabled: !!id,
  });
}

/**
 * Create a new template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTemplateInput) => templateService.createTemplate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

/**
 * Update a template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTemplateInput }) =>
      templateService.updateTemplate(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: templateKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: templateKeys.lists() });
    },
  });
}

/**
 * Delete a template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => templateService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: templateKeys.all });
    },
  });
}

// =============================================================================
// Message Hooks
// =============================================================================

/**
 * Update message status
 */
export function useUpdateMessageStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      messageId,
      status,
      metadata,
    }: {
      messageId: string;
      status: MessageStatus;
      metadata?: { externalId?: string; providerStatus?: string; errorMessage?: string };
    }) => messageService.updateMessageStatus(messageId, status, metadata),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.messages(data.campaignId) });
      queryClient.invalidateQueries({ queryKey: campaignKeys.metrics(data.campaignId) });
    },
  });
}
