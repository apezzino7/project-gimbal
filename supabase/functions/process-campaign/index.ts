/**
 * Process Campaign Edge Function
 *
 * Processes scheduled campaigns and sends messages to recipients.
 * - Fetches campaigns ready to send (scheduled_at <= now, status = 'scheduled')
 * - Gets eligible recipients via get_campaign_recipients() RPC
 * - Creates campaign_messages records
 * - Sends messages with rate limiting
 * - Updates campaign status
 *
 * Can be triggered by:
 * - Cron job (pg_cron)
 * - Manual API call
 */

import { corsHeaders, corsResponse, corsErrorResponse, handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin, requireAuth } from '../_shared/supabase.ts';

// =============================================================================
// Types
// =============================================================================

interface Campaign {
  id: string;
  user_id: string;
  campaign_type: 'sms' | 'email';
  content: string;
  subject?: string;
  scheduled_at: string;
  status: string;
}

interface Recipient {
  member_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  site_timezone: string;
}

interface ProcessResult {
  campaignId: string;
  totalRecipients: number;
  messagesCreated: number;
  messagesSent: number;
  messagesFailed: number;
  errors: string[];
}

// =============================================================================
// Constants
// =============================================================================

const SMS_RATE_LIMIT = 10; // messages per second
const EMAIL_RATE_LIMIT = 100; // messages per second

// =============================================================================
// Helper Functions
// =============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function replaceVariables(
  template: string,
  recipient: Recipient
): string {
  return template
    .replace(/\{\{firstName\}\}/g, recipient.first_name || '')
    .replace(/\{\{lastName\}\}/g, recipient.last_name || '')
    .replace(/\{\{email\}\}/g, recipient.email || '')
    .replace(/\{\{phone\}\}/g, recipient.phone || '');
}

// =============================================================================
// Campaign Processing
// =============================================================================

async function processCampaign(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  campaign: Campaign
): Promise<ProcessResult> {
  const result: ProcessResult = {
    campaignId: campaign.id,
    totalRecipients: 0,
    messagesCreated: 0,
    messagesSent: 0,
    messagesFailed: 0,
    errors: [],
  };

  try {
    // Update campaign status to 'sending'
    await supabase
      .from('campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    // Get eligible recipients
    const { data: recipients, error: recipientsError } = await supabase.rpc(
      'get_campaign_recipients',
      { p_campaign_id: campaign.id }
    );

    if (recipientsError) {
      throw new Error(`Failed to get recipients: ${recipientsError.message}`);
    }

    result.totalRecipients = recipients?.length || 0;

    if (result.totalRecipients === 0) {
      // No recipients - mark as sent
      await supabase
        .from('campaigns')
        .update({
          status: 'sent',
          completed_at: new Date().toISOString(),
          total_recipients: 0,
        })
        .eq('id', campaign.id);

      return result;
    }

    // Create message records for all recipients
    const messageRecords = recipients.map((recipient: Recipient) => ({
      campaign_id: campaign.id,
      member_id: recipient.member_id,
      channel: campaign.campaign_type,
      recipient_address:
        campaign.campaign_type === 'sms' ? recipient.phone : recipient.email,
      status: 'queued',
      queued_at: new Date().toISOString(),
    }));

    const { data: messages, error: insertError } = await supabase
      .from('campaign_messages')
      .insert(messageRecords)
      .select('id, member_id, recipient_address');

    if (insertError) {
      throw new Error(`Failed to create messages: ${insertError.message}`);
    }

    result.messagesCreated = messages?.length || 0;

    // Update campaign with recipient count
    await supabase
      .from('campaigns')
      .update({ total_recipients: result.totalRecipients })
      .eq('id', campaign.id);

    // Send messages with rate limiting
    const rateLimit =
      campaign.campaign_type === 'sms' ? SMS_RATE_LIMIT : EMAIL_RATE_LIMIT;

    for (let i = 0; i < messages.length; i += rateLimit) {
      const batch = messages.slice(i, i + rateLimit);

      // Process batch in parallel
      const batchPromises = batch.map(async (message) => {
        const recipient = recipients.find(
          (r: Recipient) => r.member_id === message.member_id
        );

        if (!recipient) {
          result.messagesFailed++;
          return;
        }

        try {
          // Render content with variables
          const content = replaceVariables(campaign.content, recipient);

          // Call the appropriate send function
          const functionName =
            campaign.campaign_type === 'sms' ? 'send-sms' : 'send-email';

          const requestBody =
            campaign.campaign_type === 'sms'
              ? {
                  messageId: message.id,
                  to: recipient.phone,
                  body: content,
                  memberId: recipient.member_id,
                  campaignId: campaign.id,
                }
              : {
                  messageId: message.id,
                  to: recipient.email,
                  subject: replaceVariables(campaign.subject || '', recipient),
                  html: content,
                  memberId: recipient.member_id,
                  campaignId: campaign.id,
                };

          const { error } = await supabase.functions.invoke(functionName, {
            body: requestBody,
          });

          if (error) {
            result.messagesFailed++;
            result.errors.push(`${message.id}: ${error.message}`);
          } else {
            result.messagesSent++;
          }
        } catch (err) {
          result.messagesFailed++;
          result.errors.push(
            `${message.id}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }
      });

      await Promise.all(batchPromises);

      // Wait 1 second before next batch (rate limiting)
      if (i + rateLimit < messages.length) {
        await sleep(1000);
      }
    }

    // Update campaign status
    const finalStatus =
      result.messagesFailed === result.messagesCreated ? 'failed' : 'sent';

    await supabase
      .from('campaigns')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        total_sent: result.messagesSent,
        total_failed: result.messagesFailed,
      })
      .eq('id', campaign.id);

    return result;
  } catch (error) {
    // Mark campaign as failed
    await supabase
      .from('campaigns')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    result.errors.push(
      error instanceof Error ? error.message : 'Unknown error'
    );
    return result;
  }
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    // Check for cron secret or user auth
    const cronSecret = req.headers.get('X-Cron-Secret');
    const expectedSecret = Deno.env.get('CRON_SECRET');

    let userId: string | null = null;

    if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
      // Cron job - no user auth needed
      userId = 'cron';
    } else {
      // Regular request - require auth
      userId = await requireAuth(req);
    }

    const supabase = createSupabaseAdmin();

    // Parse request for optional campaign ID
    let specificCampaignId: string | null = null;
    try {
      const body = await req.json();
      specificCampaignId = body.campaignId;
    } catch {
      // No body or invalid JSON - process all scheduled campaigns
    }

    // Fetch campaigns to process
    let query = supabase
      .from('campaigns')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', new Date().toISOString());

    if (specificCampaignId) {
      query = query.eq('id', specificCampaignId);
    }

    const { data: campaigns, error: fetchError } = await query;

    if (fetchError) {
      return corsErrorResponse(
        `Failed to fetch campaigns: ${fetchError.message}`,
        500
      );
    }

    if (!campaigns || campaigns.length === 0) {
      return corsResponse({
        success: true,
        message: 'No campaigns to process',
        results: [],
      });
    }

    // Process each campaign
    const results: ProcessResult[] = [];

    for (const campaign of campaigns) {
      const result = await processCampaign(supabase, campaign);
      results.push(result);

      // Log audit event
      await supabase.from('audit_logs').insert({
        event_type: 'CAMPAIGN_PROCESSED',
        email: userId || 'system',
        metadata: {
          campaignId: campaign.id,
          campaignType: campaign.campaign_type,
          totalRecipients: result.totalRecipients,
          messagesSent: result.messagesSent,
          messagesFailed: result.messagesFailed,
        },
      });
    }

    return corsResponse({
      success: true,
      message: `Processed ${campaigns.length} campaign(s)`,
      results,
    });
  } catch (error) {
    console.error('Process campaign error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return corsErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    return corsErrorResponse(
      'Failed to process campaigns',
      500,
      'INTERNAL_ERROR'
    );
  }
});
