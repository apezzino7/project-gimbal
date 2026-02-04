/**
 * Message Service
 * Track individual message delivery status
 */

import { supabase } from '@/lib/supabase';
import type {
  CampaignMessage,
  CampaignMessageWithMember,
  MessageStatus,
} from '@/types/campaign';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function MessageServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'MessageServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Transform Functions
// =============================================================================

function transformMessage(row: Record<string, unknown>): CampaignMessage {
  return {
    id: row.id as string,
    campaignId: row.campaign_id as string,
    memberId: row.member_id as string,
    channel: row.channel as CampaignMessage['channel'],
    recipientAddress: row.recipient_address as string,
    status: row.status as MessageStatus,
    queuedAt: row.queued_at as string,
    sentAt: row.sent_at as string | null,
    deliveredAt: row.delivered_at as string | null,
    openedAt: row.opened_at as string | null,
    clickedAt: row.clicked_at as string | null,
    failedAt: row.failed_at as string | null,
    externalId: row.external_id as string | null,
    providerStatus: row.provider_status as string | null,
    errorMessage: row.error_message as string | null,
    metadata: row.metadata as Record<string, unknown>,
  };
}

function transformMessageWithMember(row: Record<string, unknown>): CampaignMessageWithMember {
  const message = transformMessage(row);

  const memberData = row.members as Record<string, unknown> | null;

  return {
    ...message,
    member: {
      id: memberData?.id as string || message.memberId,
      firstName: memberData?.first_name as string | null ?? null,
      lastName: memberData?.last_name as string | null ?? null,
      email: memberData?.email as string | null ?? null,
      phone: memberData?.phone as string | null ?? null,
    },
  };
}

// =============================================================================
// Query Operations
// =============================================================================

/**
 * Get messages for a campaign
 */
export async function getCampaignMessages(
  campaignId: string,
  params?: {
    status?: MessageStatus;
    limit?: number;
    offset?: number;
  }
): Promise<CampaignMessageWithMember[]> {
  let query = supabase
    .from('campaign_messages')
    .select(`
      *,
      members (id, first_name, last_name, email, phone)
    `)
    .eq('campaign_id', campaignId)
    .order('queued_at', { ascending: false });

  if (params?.status) {
    query = query.eq('status', params.status);
  }

  if (params?.limit) {
    query = query.limit(params.limit);
  }

  if (params?.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw MessageServiceError('Failed to fetch campaign messages', error);
  }

  return (data || []).map(transformMessageWithMember);
}

/**
 * Get a single message by ID
 */
export async function getMessageById(id: string): Promise<CampaignMessageWithMember | null> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select(`
      *,
      members (id, first_name, last_name, email, phone)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MessageServiceError('Failed to fetch message', error);
  }

  return data ? transformMessageWithMember(data) : null;
}

/**
 * Get message by external ID (for webhook processing)
 */
export async function getMessageByExternalId(externalId: string): Promise<CampaignMessage | null> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select('*')
    .eq('external_id', externalId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw MessageServiceError('Failed to fetch message by external ID', error);
  }

  return data ? transformMessage(data) : null;
}

/**
 * Get message counts by status for a campaign
 */
export async function getMessageCountsByStatus(campaignId: string): Promise<Record<MessageStatus, number>> {
  const { data, error } = await supabase
    .from('campaign_messages')
    .select('status')
    .eq('campaign_id', campaignId);

  if (error) {
    throw MessageServiceError('Failed to get message counts', error);
  }

  const counts: Record<MessageStatus, number> = {
    queued: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    bounced: 0,
    failed: 0,
  };

  for (const row of data || []) {
    const status = row.status as MessageStatus;
    counts[status] = (counts[status] || 0) + 1;
  }

  return counts;
}

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Update message status
 */
export async function updateMessageStatus(
  messageId: string,
  status: MessageStatus,
  metadata?: {
    externalId?: string;
    providerStatus?: string;
    errorMessage?: string;
  }
): Promise<CampaignMessage> {
  const updateData: Record<string, unknown> = { status };

  // Set appropriate timestamp based on status
  const now = new Date().toISOString();
  switch (status) {
    case 'sent':
      updateData.sent_at = now;
      break;
    case 'delivered':
      updateData.delivered_at = now;
      break;
    case 'opened':
      updateData.opened_at = now;
      break;
    case 'clicked':
      updateData.clicked_at = now;
      break;
    case 'failed':
    case 'bounced':
      updateData.failed_at = now;
      break;
  }

  if (metadata?.externalId) {
    updateData.external_id = metadata.externalId;
  }
  if (metadata?.providerStatus) {
    updateData.provider_status = metadata.providerStatus;
  }
  if (metadata?.errorMessage) {
    updateData.error_message = metadata.errorMessage;
  }

  const { data, error } = await supabase
    .from('campaign_messages')
    .update(updateData)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw MessageServiceError('Failed to update message status', error);
  }

  return transformMessage(data);
}

/**
 * Update message by external ID (for webhooks)
 */
export async function updateMessageByExternalId(
  externalId: string,
  status: MessageStatus,
  metadata?: {
    providerStatus?: string;
    errorMessage?: string;
  }
): Promise<CampaignMessage | null> {
  const message = await getMessageByExternalId(externalId);
  if (!message) return null;

  return updateMessageStatus(message.id, status, metadata);
}

/**
 * Mark message as opened
 */
export async function markMessageOpened(messageId: string): Promise<CampaignMessage> {
  const message = await getMessageById(messageId);
  if (!message) {
    throw MessageServiceError('Message not found');
  }

  // Only update if not already opened
  if (message.openedAt) {
    return message;
  }

  return updateMessageStatus(messageId, 'opened');
}

/**
 * Mark message as clicked
 */
export async function markMessageClicked(messageId: string): Promise<CampaignMessage> {
  const message = await getMessageById(messageId);
  if (!message) {
    throw MessageServiceError('Message not found');
  }

  // Mark as opened if not already (click implies open)
  const updates: Record<string, unknown> = {
    status: 'clicked',
    clicked_at: new Date().toISOString(),
  };

  if (!message.openedAt) {
    updates.opened_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('campaign_messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    throw MessageServiceError('Failed to mark message clicked', error);
  }

  return transformMessage(data);
}

// =============================================================================
// Export Service Object
// =============================================================================

export const messageService = {
  getCampaignMessages,
  getMessageById,
  getMessageByExternalId,
  getMessageCountsByStatus,
  updateMessageStatus,
  updateMessageByExternalId,
  markMessageOpened,
  markMessageClicked,
};

export default messageService;
