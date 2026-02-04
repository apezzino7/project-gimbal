/**
 * SendGrid Webhook Edge Function
 *
 * Receives event webhooks from SendGrid and updates message status.
 * - Verifies SendGrid signature for security
 * - Handles events: delivered, open, click, bounce, unsubscribe
 * - Updates campaign_messages table
 * - Updates campaign aggregate stats
 * - Handles unsubscribes by updating member_consent
 */

import { createSupabaseAdmin } from '../_shared/supabase.ts';

// =============================================================================
// Types
// =============================================================================

interface SendGridEvent {
  email: string;
  timestamp: number;
  'smtp-id'?: string;
  event: string;
  category?: string[];
  sg_event_id: string;
  sg_message_id: string;
  response?: string;
  reason?: string;
  url?: string;
  useragent?: string;
  ip?: string;
  // Custom arguments we pass when sending
  messageId?: string;
  campaignId?: string;
  memberId?: string;
}

// SendGrid event mapping to our message status
const EVENT_STATUS_MAP: Record<string, string> = {
  processed: 'sent',
  delivered: 'delivered',
  open: 'opened',
  click: 'clicked',
  bounce: 'bounced',
  dropped: 'failed',
  deferred: 'sent', // Still attempting delivery
  unsubscribe: 'delivered', // Message was delivered but user unsubscribed
  spamreport: 'delivered', // Message was delivered but marked as spam
};

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verifies SendGrid webhook signature using ECDSA
 * @see https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook-security-features
 */
async function verifySendGridSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const publicKey = Deno.env.get('SENDGRID_WEBHOOK_VERIFICATION_KEY');
  if (!publicKey) {
    console.warn('SENDGRID_WEBHOOK_VERIFICATION_KEY not configured, skipping verification');
    return true; // Skip verification if not configured
  }

  const signature = req.headers.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = req.headers.get('X-Twilio-Email-Event-Webhook-Timestamp');

  if (!signature || !timestamp) {
    console.error('Missing SendGrid signature headers');
    return false;
  }

  try {
    // Payload to verify is timestamp + body
    const payload = timestamp + body;

    // Import the public key
    const key = await crypto.subtle.importKey(
      'raw',
      Uint8Array.from(atob(publicKey), (c) => c.charCodeAt(0)),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    // Decode the signature
    const sig = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));

    // Verify
    const encoder = new TextEncoder();
    const isValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      sig,
      encoder.encode(payload)
    );

    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleUnsubscribe(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  event: SendGridEvent
): Promise<void> {
  // Find member by email and update consent
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('email', event.email)
    .single();

  if (member) {
    await supabase
      .from('member_consent')
      .update({
        email_marketing: false,
        email_opted_out_at: new Date().toISOString(),
      })
      .eq('member_id', member.id);

    console.log(`Unsubscribe processed for member: ${member.id}`);
  }
}

async function updateMessageStatus(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  event: SendGridEvent,
  newStatus: string
): Promise<{ campaignId: string | null }> {
  const now = new Date().toISOString();

  // Build update object based on status
  const updateData: Record<string, unknown> = {
    status: newStatus,
  };

  // Set timestamp based on event type
  switch (event.event) {
    case 'delivered':
      updateData.delivered_at = now;
      break;
    case 'open':
      updateData.opened_at = now;
      break;
    case 'click':
      updateData.clicked_at = now;
      break;
    case 'bounce':
    case 'dropped':
      updateData.failed_at = now;
      updateData.error_message = event.reason || event.response || 'Delivery failed';
      break;
  }

  // Update message record using sg_message_id
  // SendGrid message ID format: "<internal_id>@domain"
  const messageIdMatch = event.sg_message_id?.match(/^([^@]+)/);
  const externalId = messageIdMatch ? messageIdMatch[1] : event.sg_message_id;

  const { data: message, error } = await supabase
    .from('campaign_messages')
    .update(updateData)
    .eq('external_id', externalId)
    .select('id, campaign_id')
    .single();

  if (error) {
    console.log('Message update skipped:', error.message);
    return { campaignId: null };
  }

  return { campaignId: message?.campaign_id || null };
}

async function updateCampaignStats(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  campaignId: string,
  event: string
): Promise<void> {
  // Map events to stat fields
  const statsFieldMap: Record<string, string> = {
    delivered: 'total_delivered',
    open: 'total_opened',
    click: 'total_clicked',
    bounce: 'total_failed',
    dropped: 'total_failed',
  };

  const statsField = statsFieldMap[event];
  if (statsField) {
    await supabase.rpc('increment_campaign_stat', {
      p_campaign_id: campaignId,
      p_field: statsField,
    });
  }
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    // Read body as text for signature verification
    const bodyText = await req.text();

    // Verify SendGrid signature (skip in development if not configured)
    const skipVerification = Deno.env.get('SKIP_SENDGRID_VERIFICATION') === 'true';
    if (!skipVerification) {
      const isValid = await verifySendGridSignature(req, bodyText);
      if (!isValid) {
        console.error('Invalid SendGrid signature');
        return new Response('Invalid signature', { status: 403 });
      }
    }

    // Parse the JSON body (SendGrid sends an array of events)
    const events: SendGridEvent[] = JSON.parse(bodyText);

    if (!Array.isArray(events)) {
      return new Response('Invalid payload format', { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Process each event
    for (const event of events) {
      const newStatus = EVENT_STATUS_MAP[event.event];
      if (!newStatus) {
        console.log(`Ignoring unknown event type: ${event.event}`);
        continue;
      }

      // Handle unsubscribe specially
      if (event.event === 'unsubscribe' || event.event === 'spamreport') {
        await handleUnsubscribe(supabase, event);
      }

      // Update message status
      const { campaignId } = await updateMessageStatus(supabase, event, newStatus);

      // Update campaign stats if we have a campaign ID
      if (campaignId) {
        await updateCampaignStats(supabase, campaignId, event.event);
      }

      console.log(
        `Email event processed: ${event.sg_message_id} -> ${event.event}`,
        campaignId ? `(campaign: ${campaignId})` : ''
      );
    }

    // Return success
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('SendGrid webhook error:', error);
    // Return 200 to prevent SendGrid from retrying
    return new Response('OK', { status: 200 });
  }
});
