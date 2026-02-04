/**
 * Twilio Webhook Edge Function
 *
 * Receives delivery status callbacks from Twilio and updates message status.
 * - Verifies Twilio signature for security
 * - Updates campaign_messages table
 * - Updates campaign aggregate stats
 */

import { createSupabaseAdmin } from '../_shared/supabase.ts';

// =============================================================================
// Types
// =============================================================================

interface TwilioWebhookPayload {
  MessageSid: string;
  MessageStatus: string;
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

// Twilio status mapping to our message status
const STATUS_MAP: Record<string, string> = {
  queued: 'queued',
  sending: 'sent',
  sent: 'sent',
  delivered: 'delivered',
  undelivered: 'failed',
  failed: 'failed',
};

// =============================================================================
// Signature Verification
// =============================================================================

/**
 * Verifies Twilio webhook signature
 * @see https://www.twilio.com/docs/usage/security#validating-requests
 */
async function verifyTwilioSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  const signature = req.headers.get('X-Twilio-Signature');
  if (!signature) {
    console.error('Missing X-Twilio-Signature header');
    return false;
  }

  // Get the full URL that Twilio called
  const url = req.url;

  // Parse the body as URL-encoded params
  const params = new URLSearchParams(body);
  const sortedParams = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + value)
    .join('');

  const dataToSign = url + sortedParams;

  // Create HMAC-SHA1 signature
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataToSign)
  );

  // Convert to base64
  const expectedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return signature === expectedSignature;
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

    // Verify Twilio signature (skip in development if not configured)
    const skipVerification = Deno.env.get('SKIP_TWILIO_VERIFICATION') === 'true';
    if (!skipVerification) {
      const isValid = await verifyTwilioSignature(req, bodyText);
      if (!isValid) {
        console.error('Invalid Twilio signature');
        return new Response('Invalid signature', { status: 403 });
      }
    }

    // Parse the URL-encoded body
    const params = new URLSearchParams(bodyText);
    const payload: TwilioWebhookPayload = {
      MessageSid: params.get('MessageSid') || '',
      MessageStatus: params.get('MessageStatus') || '',
      To: params.get('To') || '',
      From: params.get('From') || '',
      ErrorCode: params.get('ErrorCode') || undefined,
      ErrorMessage: params.get('ErrorMessage') || undefined,
    };

    if (!payload.MessageSid || !payload.MessageStatus) {
      return new Response('Missing required fields', { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    const newStatus = STATUS_MAP[payload.MessageStatus] || payload.MessageStatus;
    const now = new Date().toISOString();

    // Build update object based on status
    const updateData: Record<string, unknown> = {
      status: newStatus,
    };

    if (newStatus === 'delivered') {
      updateData.delivered_at = now;
    } else if (newStatus === 'failed') {
      updateData.failed_at = now;
      if (payload.ErrorMessage) {
        updateData.error_message = `${payload.ErrorCode}: ${payload.ErrorMessage}`;
      }
    }

    // Update the message record
    const { data: message, error: updateError } = await supabase
      .from('campaign_messages')
      .update(updateData)
      .eq('external_id', payload.MessageSid)
      .select('id, campaign_id')
      .single();

    if (updateError) {
      // Message might not exist if this is a test or duplicate webhook
      console.log('Message update skipped:', updateError.message);
    }

    // Update campaign aggregate stats if we found the message
    if (message?.campaign_id && (newStatus === 'delivered' || newStatus === 'failed')) {
      const statsField =
        newStatus === 'delivered' ? 'total_delivered' : 'total_failed';

      await supabase.rpc('increment_campaign_stat', {
        p_campaign_id: message.campaign_id,
        p_field: statsField,
      });
    }

    // Log the webhook event
    console.log(
      `SMS status update: ${payload.MessageSid} -> ${newStatus}`,
      message?.campaign_id ? `(campaign: ${message.campaign_id})` : ''
    );

    // Return success (Twilio expects 200 response)
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Twilio webhook error:', error);
    // Return 200 to prevent Twilio from retrying
    // We don't want to lose webhooks due to temporary errors
    return new Response('OK', { status: 200 });
  }
});
