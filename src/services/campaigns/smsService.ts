/**
 * SMS Service
 * Client-side service for sending SMS via Twilio through Edge Functions
 */

import { supabase } from '@/lib/supabase';
import { validateE164, formatToE164, maskPhone } from '@/utils/phone';
import type { PhoneValidationResult } from '@/utils/phone';

// =============================================================================
// Types
// =============================================================================

export interface SendSmsRequest {
  messageId: string;
  to: string;
  body: string;
  memberId?: string;
  campaignId?: string;
}

export interface SendSmsResponse {
  success: boolean;
  messageId: string;
  externalId?: string;
  status?: string;
  error?: string;
  code?: string;
}

export interface SmsConsentResult {
  canSend: boolean;
  reason?: string;
}

// =============================================================================
// Constants
// =============================================================================

// Standard SMS segment is 160 characters (or 70 for Unicode)
export const SMS_SEGMENT_LENGTH = 160;
export const SMS_UNICODE_SEGMENT_LENGTH = 70;
export const MAX_SMS_SEGMENTS = 10;
export const MAX_SMS_LENGTH = SMS_SEGMENT_LENGTH * MAX_SMS_SEGMENTS;

// =============================================================================
// Service Implementation
// =============================================================================

export const smsService = {
  /**
   * Send a single SMS message via the Edge Function
   */
  async sendSingle(request: SendSmsRequest): Promise<SendSmsResponse> {
    const { data, error } = await supabase.functions.invoke('send-sms', {
      body: request,
    });

    if (error) {
      return {
        success: false,
        messageId: request.messageId,
        error: error.message || 'Failed to send SMS',
        code: 'INVOKE_ERROR',
      };
    }

    return data as SendSmsResponse;
  },

  /**
   * Check if SMS can be sent to a member (TCPA consent + quiet hours)
   */
  async checkConsent(
    memberId: string,
    timezone = 'America/New_York'
  ): Promise<SmsConsentResult> {
    const { data, error } = await supabase.rpc('can_send_sms', {
      p_member_id: memberId,
      p_timezone: timezone,
    });

    if (error) {
      console.error('SMS consent check error:', error);
      return {
        canSend: false,
        reason: 'Failed to verify consent',
      };
    }

    if (data === true) {
      return { canSend: true };
    }

    return {
      canSend: false,
      reason: 'SMS consent not granted or outside quiet hours (8 AM - 9 PM)',
    };
  },

  /**
   * Validate and format a phone number
   */
  validatePhoneNumber(phone: string): PhoneValidationResult {
    return validateE164(phone);
  },

  /**
   * Format a phone number to E.164 format
   */
  formatPhoneNumber(phone: string): string | null {
    return formatToE164(phone);
  },

  /**
   * Mask a phone number for display
   */
  maskPhoneNumber(phone: string): string {
    return maskPhone(phone);
  },

  /**
   * Calculate SMS segment count and character info
   */
  calculateSegments(content: string): {
    characterCount: number;
    segmentCount: number;
    segmentLength: number;
    isUnicode: boolean;
    remainingInSegment: number;
  } {
    // Check if content contains Unicode characters
    // eslint-disable-next-line no-control-regex
    const isUnicode = /[^\x00-\x7F]/.test(content);
    const segmentLength = isUnicode
      ? SMS_UNICODE_SEGMENT_LENGTH
      : SMS_SEGMENT_LENGTH;

    const characterCount = content.length;
    const segmentCount = Math.ceil(characterCount / segmentLength) || 1;
    const remainingInSegment =
      segmentLength - (characterCount % segmentLength || segmentLength);

    return {
      characterCount,
      segmentCount,
      segmentLength,
      isUnicode,
      remainingInSegment,
    };
  },

  /**
   * Replace template variables in SMS content
   */
  renderTemplate(
    template: string,
    variables: Record<string, string>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] ?? match;
    });
  },

  /**
   * Validate SMS content
   */
  validateContent(content: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Message content is required');
    }

    if (content.length > MAX_SMS_LENGTH) {
      errors.push(`Message exceeds maximum length of ${MAX_SMS_LENGTH} characters`);
    }

    const { segmentCount, isUnicode } = this.calculateSegments(content);

    if (segmentCount > MAX_SMS_SEGMENTS) {
      errors.push(`Message would require ${segmentCount} segments (max ${MAX_SMS_SEGMENTS})`);
    } else if (segmentCount > 1) {
      warnings.push(`Message will be sent as ${segmentCount} SMS segments`);
    }

    if (isUnicode) {
      warnings.push('Message contains special characters, reducing segment capacity');
    }

    // Check for unsubscribe mention (TCPA best practice)
    const hasUnsubscribe =
      content.toLowerCase().includes('stop') ||
      content.toLowerCase().includes('unsubscribe') ||
      content.toLowerCase().includes('opt out');

    if (!hasUnsubscribe) {
      warnings.push('Consider including opt-out instructions (e.g., "Reply STOP to unsubscribe")');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },
};

export default smsService;
