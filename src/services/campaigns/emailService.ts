/**
 * Email Service
 * Client-side service for sending emails via SendGrid through Edge Functions
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// Types
// =============================================================================

export interface SendEmailRequest {
  messageId: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  memberId?: string;
  campaignId?: string;
  unsubscribeUrl?: string;
}

export interface SendEmailResponse {
  success: boolean;
  messageId: string;
  externalId?: string;
  status?: string;
  error?: string;
  code?: string;
}

export interface EmailConsentResult {
  canSend: boolean;
  reason?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const MAX_SUBJECT_LENGTH = 255;
export const RECOMMENDED_SUBJECT_LENGTH = 78;

// =============================================================================
// Service Implementation
// =============================================================================

export const emailService = {
  /**
   * Send a single email via the Edge Function
   */
  async sendSingle(request: SendEmailRequest): Promise<SendEmailResponse> {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: request,
    });

    if (error) {
      return {
        success: false,
        messageId: request.messageId,
        error: error.message || 'Failed to send email',
        code: 'INVOKE_ERROR',
      };
    }

    return data as SendEmailResponse;
  },

  /**
   * Check if email can be sent to a member (CAN-SPAM consent)
   */
  async checkConsent(memberId: string): Promise<EmailConsentResult> {
    const { data, error } = await supabase.rpc('can_send_email', {
      p_member_id: memberId,
    });

    if (error) {
      console.error('Email consent check error:', error);
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
      reason: 'Email consent not granted or user has unsubscribed',
    };
  },

  /**
   * Validate email format
   */
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Replace template variables in email content
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
   * Validate email content for CAN-SPAM compliance
   */
  validateContent(
    html: string,
    subject: string
  ): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Subject validation
    if (!subject || subject.trim().length === 0) {
      errors.push('Subject is required');
    }

    if (subject && subject.length > MAX_SUBJECT_LENGTH) {
      errors.push(`Subject exceeds maximum length of ${MAX_SUBJECT_LENGTH} characters`);
    }

    if (subject && subject.length > RECOMMENDED_SUBJECT_LENGTH) {
      warnings.push(
        `Subject is longer than recommended ${RECOMMENDED_SUBJECT_LENGTH} characters and may be truncated`
      );
    }

    // HTML content validation
    if (!html || html.trim().length === 0) {
      errors.push('Email content is required');
    }

    // Check for unsubscribe link (CAN-SPAM requirement)
    const hasUnsubscribe =
      html.toLowerCase().includes('unsubscribe') ||
      html.toLowerCase().includes('{{unsubscribeurl}}');

    if (!hasUnsubscribe) {
      warnings.push(
        'Email should include an unsubscribe link for CAN-SPAM compliance'
      );
    }

    // Check for physical address placeholder (CAN-SPAM requirement)
    const hasAddress =
      html.includes('{{physicalAddress}}') ||
      html.includes('{{companyAddress}}') ||
      // Common address patterns
      /\d+\s+[\w\s]+,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}/.test(html);

    if (!hasAddress) {
      warnings.push(
        'Email should include a physical address for CAN-SPAM compliance'
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  },

  /**
   * Generate a plain text version from HTML
   */
  htmlToText(html: string): string {
    // Basic HTML to text conversion
    return html
      // Remove scripts and styles
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Replace common tags
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      // Handle links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
      // Remove remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /**
   * Mask an email for display
   */
  maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***';

    const maskedLocal =
      local.length > 2
        ? local.slice(0, 2) + '***'
        : '***';

    return `${maskedLocal}@${domain}`;
  },

  /**
   * Calculate approximate email size in KB
   */
  calculateSize(html: string, text?: string): number {
    const totalChars = html.length + (text?.length || 0);
    return Math.ceil(totalChars / 1024);
  },
};

export default emailService;
