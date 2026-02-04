/**
 * Send Email Edge Function
 *
 * Sends an email via SendGrid with CAN-SPAM compliance checks.
 * - Validates email format
 * - Checks consent via can_send_email() RPC
 * - Sends via SendGrid API
 * - Updates message status in database
 */

import { corsHeaders, corsResponse, corsErrorResponse, handleCors } from '../_shared/cors.ts';
import { createSupabaseAdmin, requireAuth } from '../_shared/supabase.ts';

// =============================================================================
// Types
// =============================================================================

interface SendEmailRequest {
  messageId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  memberId?: string;
  campaignId?: string;
  unsubscribeUrl?: string;
}

interface SendGridResponse {
  statusCode: number;
  headers: Record<string, string>;
}

// =============================================================================
// Validation
// =============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

// =============================================================================
// SendGrid Integration
// =============================================================================

async function sendViaSendGrid(
  to: string,
  subject: string,
  html: string,
  text?: string,
  unsubscribeUrl?: string
): Promise<SendGridResponse> {
  const apiKey = Deno.env.get('SENDGRID_API_KEY');
  const fromEmail = Deno.env.get('SENDGRID_FROM_EMAIL');
  const fromName = Deno.env.get('SENDGRID_FROM_NAME') || 'Project Gimbal';

  if (!apiKey || !fromEmail) {
    throw new Error('SendGrid credentials not configured');
  }

  // Build the email payload
  const payload: Record<string, unknown> = {
    personalizations: [
      {
        to: [{ email: to }],
      },
    ],
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject,
    content: [
      ...(text ? [{ type: 'text/plain', value: text }] : []),
      { type: 'text/html', value: html },
    ],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking: { enable: true },
    },
  };

  // Add unsubscribe header for CAN-SPAM compliance
  if (unsubscribeUrl) {
    payload.headers = {
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    };
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`SendGrid error: ${response.status} - ${errorBody}`);
  }

  // Extract message ID from headers
  const messageId = response.headers.get('X-Message-Id') || '';

  return {
    statusCode: response.status,
    headers: {
      'x-message-id': messageId,
    },
  };
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
    const {
      messageId,
      to,
      subject,
      html,
      text,
      memberId,
      campaignId,
      unsubscribeUrl,
    }: SendEmailRequest = await req.json();

    // Validate required fields
    if (!messageId || !to || !subject || !html) {
      return corsErrorResponse(
        'Missing required fields: messageId, to, subject, html',
        400
      );
    }

    // Validate email format
    if (!isValidEmail(to)) {
      return corsErrorResponse(
        'Invalid email format',
        400,
        'INVALID_EMAIL_FORMAT'
      );
    }

    // Validate subject length
    if (subject.length > 255) {
      return corsErrorResponse(
        'Subject too long. Maximum 255 characters',
        400,
        'SUBJECT_TOO_LONG'
      );
    }

    const supabase = createSupabaseAdmin();

    // Check CAN-SPAM consent if memberId is provided
    if (memberId) {
      const { data: canSend, error: consentError } = await supabase.rpc(
        'can_send_email',
        {
          p_member_id: memberId,
        }
      );

      if (consentError) {
        console.error('Consent check error:', consentError);
        return corsErrorResponse(
          'Failed to verify email consent',
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
            error_message: 'Email consent not granted or user unsubscribed',
          })
          .eq('id', messageId);

        return corsErrorResponse(
          'Email consent not granted or user has unsubscribed',
          403,
          'CONSENT_DENIED'
        );
      }
    }

    // Generate unsubscribe URL if not provided
    const finalUnsubscribeUrl =
      unsubscribeUrl ||
      `${Deno.env.get('PUBLIC_SITE_URL')}/unsubscribe?member=${memberId}`;

    // Send via SendGrid
    const sendGridResponse = await sendViaSendGrid(
      to,
      subject,
      html,
      text,
      finalUnsubscribeUrl
    );

    // Update message status in database
    const { error: updateError } = await supabase
      .from('campaign_messages')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        external_id: sendGridResponse.headers['x-message-id'],
      })
      .eq('id', messageId);

    if (updateError) {
      console.error('Failed to update message status:', updateError);
      // Don't fail the request - the email was sent successfully
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      event_type: 'EMAIL_SENT',
      email: userId,
      metadata: {
        messageId,
        campaignId,
        memberId,
        sendGridId: sendGridResponse.headers['x-message-id'],
        recipientMasked: to.replace(/(.{2}).*@/, '$1***@'),
      },
    });

    return corsResponse({
      success: true,
      messageId,
      externalId: sendGridResponse.headers['x-message-id'],
      status: 'sent',
    });
  } catch (error) {
    console.error('Send email error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return corsErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
      }

      if (error.message.includes('SendGrid')) {
        return corsErrorResponse(
          `Email delivery failed: ${error.message}`,
          502,
          'SENDGRID_ERROR'
        );
      }
    }

    return corsErrorResponse('Failed to send email', 500, 'INTERNAL_ERROR');
  }
});
