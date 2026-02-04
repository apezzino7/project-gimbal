/**
 * Send SMS Edge Function
 *
 * Sends an SMS message via Twilio with TCPA compliance checks.
 * - Validates phone number format (E.164)
 * - Checks consent via can_send_sms() RPC
 * - Sends via Twilio API
 * - Updates message status in database
 */

import { corsHeaders, corsResponse, corsErrorResponse, handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin, requireAuth } from '../_shared/supabase.ts';

// =============================================================================
// Types
// =============================================================================

interface SendSmsRequest {
  messageId: string;
  to: string;
  body: string;
  memberId?: string;
  campaignId?: string;
}

interface TwilioResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

// =============================================================================
// Validation
// =============================================================================

const E164_REGEX = /^\+[1-9]\d{1,14}$/;

function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

// =============================================================================
// Twilio Integration
// =============================================================================

async function sendViaTwilio(
  to: string,
  body: string,
  webhookUrl?: string
): Promise<TwilioResponse> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured');
  }

  const params = new URLSearchParams({
    To: to,
    From: fromNumber,
    Body: body,
  });

  // Add status callback if webhook URL is configured
  if (webhookUrl) {
    params.append('StatusCallback', webhookUrl);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `Twilio error: ${response.status}`);
  }

  return data as TwilioResponse;
}

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResult = handleCors(req);
  if (corsResult) return corsResult;

  try {
    // Verify authentication
    const userId = await requireAuth(req);

    // Parse request body
    const { messageId, to, body, memberId, campaignId }: SendSmsRequest =
      await req.json();

    // Validate required fields
    if (!messageId || !to || !body) {
      return corsErrorResponse('Missing required fields: messageId, to, body', 400);
    }

    // Validate phone number format
    if (!isValidE164(to)) {
      return corsErrorResponse(
        'Invalid phone number format. Must be E.164 format (e.g., +14155551234)',
        400,
        'INVALID_PHONE_FORMAT'
      );
    }

    // Validate message length (SMS limit)
    if (body.length > 1600) {
      return corsErrorResponse(
        'Message too long. Maximum 1600 characters (10 SMS segments)',
        400,
        'MESSAGE_TOO_LONG'
      );
    }

    const supabase = createSupabaseAdmin();

    // Check TCPA consent if memberId is provided
    if (memberId) {
      const { data: canSend, error: consentError } = await supabase.rpc(
        'can_send_sms',
        {
          p_member_id: memberId,
          p_timezone: 'America/New_York', // Default timezone
        }
      );

      if (consentError) {
        console.error('Consent check error:', consentError);
        return corsErrorResponse(
          'Failed to verify SMS consent',
          500,
          'CONSENT_CHECK_FAILED'
        );
      }

      if (!canSend) {
        // Update message status to failed due to consent
        await supabase
          .from('campaign_messages')
          .update({
            status: 'failed',
            failed_at: new Date().toISOString(),
            error_message: 'SMS consent not granted or outside quiet hours',
          })
          .eq('id', messageId);

        return corsErrorResponse(
          'SMS consent not granted or outside quiet hours (8 AM - 9 PM)',
          403,
          'CONSENT_DENIED'
        );
      }
    }

    // Get webhook URL from environment
    const webhookUrl = Deno.env.get('TWILIO_WEBHOOK_URL');

    // Send via Twilio
    const twilioResponse = await sendViaTwilio(to, body, webhookUrl);

    // Update message status in database
    const { error: updateError } = await supabase
      .from('campaign_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: twilioResponse.sid,
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Failed to update message status:', updateError);
      // Don't fail the request - the SMS was sent successfully
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      event_type: 'SMS_SENT',
      email: userId,
      metadata: {
        messageId,
        campaignId,
        memberId,
        twilioSid: twilioResponse.sid,
        recipientMasked: to.slice(0, -4).replace(/\d/g, '*') + to.slice(-4),
      },
    });

    return corsResponse({
      success: true,
      messageId,
      externalId: twilioResponse.sid,
      status: twilioResponse.status,
    });
  } catch (error) {
    console.error('Send SMS error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return corsErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
      }

      if (error.message.includes('Twilio')) {
        return corsErrorResponse(
          `SMS delivery failed: ${error.message}`,
          502,
          'TWILIO_ERROR'
        );
      }
    }

    return corsErrorResponse(
      'Failed to send SMS',
      500,
      'INTERNAL_ERROR'
    );
  }
});
