/**
 * Template Service
 * CRUD operations for campaign templates
 */

import { supabase } from '@/lib/supabase';
import type {
  CampaignTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  CampaignType,
  SmsValidationResult,
} from '@/types/campaign';

// =============================================================================
// Error Handling
// =============================================================================

interface ServiceError extends Error {
  cause?: Error;
}

function TemplateServiceError(message: string, cause?: Error): ServiceError {
  const error = new Error(message) as ServiceError;
  error.name = 'TemplateServiceError';
  if (cause) {
    error.cause = cause;
  }
  return error;
}

// =============================================================================
// Transform Functions
// =============================================================================

function transformTemplate(row: Record<string, unknown>): CampaignTemplate {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    description: row.description as string | null,
    templateType: row.template_type as CampaignType,
    subject: row.subject as string | null,
    content: row.content as string,
    preheader: row.preheader as string | null,
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get all templates with optional type filter
 */
export async function getTemplates(type?: CampaignType): Promise<CampaignTemplate[]> {
  let query = supabase
    .from('campaign_templates')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true });

  if (type) {
    query = query.eq('template_type', type);
  }

  const { data, error } = await query;

  if (error) {
    throw TemplateServiceError('Failed to fetch templates', error);
  }

  return (data || []).map(transformTemplate);
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(id: string): Promise<CampaignTemplate | null> {
  const { data, error } = await supabase
    .from('campaign_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw TemplateServiceError('Failed to fetch template', error);
  }

  return data ? transformTemplate(data) : null;
}

/**
 * Create a new template
 */
export async function createTemplate(input: CreateTemplateInput): Promise<CampaignTemplate> {
  const { data, error } = await supabase
    .from('campaign_templates')
    .insert({
      name: input.name,
      description: input.description || null,
      template_type: input.templateType,
      subject: input.subject || null,
      content: input.content,
      preheader: input.preheader || null,
    })
    .select()
    .single();

  if (error) {
    throw TemplateServiceError('Failed to create template', error);
  }

  return transformTemplate(data);
}

/**
 * Update a template
 */
export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<CampaignTemplate> {
  const updateData: Record<string, unknown> = {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.templateType !== undefined) updateData.template_type = input.templateType;
  if (input.subject !== undefined) updateData.subject = input.subject;
  if (input.content !== undefined) updateData.content = input.content;
  if (input.preheader !== undefined) updateData.preheader = input.preheader;
  if (input.isActive !== undefined) updateData.is_active = input.isActive;

  const { data, error } = await supabase
    .from('campaign_templates')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw TemplateServiceError('Failed to update template', error);
  }

  return transformTemplate(data);
}

/**
 * Delete a template (soft delete by setting is_active = false)
 */
export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) {
    throw TemplateServiceError('Failed to delete template', error);
  }
}

/**
 * Hard delete a template
 */
export async function hardDeleteTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from('campaign_templates')
    .delete()
    .eq('id', id);

  if (error) {
    throw TemplateServiceError('Failed to delete template', error);
  }
}

// =============================================================================
// Template Helpers
// =============================================================================

const SEGMENT_SIZE = 160;
const UNICODE_SEGMENT_SIZE = 70;

/**
 * Check if content contains Unicode characters that require UCS-2 encoding
 */
function containsUnicode(text: string): boolean {
  // GSM 7-bit character set
  const gsm7bit = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜa-zäöñüà]*$/;
  return !gsm7bit.test(text);
}

/**
 * Calculate SMS segment count
 */
function calculateSegmentCount(text: string): number {
  const isUnicode = containsUnicode(text);
  const segmentSize = isUnicode ? UNICODE_SEGMENT_SIZE : SEGMENT_SIZE;

  if (text.length <= segmentSize) {
    return 1;
  }

  // Multi-part messages have overhead for concatenation headers
  const multipartSegmentSize = isUnicode ? 67 : 153;
  return Math.ceil(text.length / multipartSegmentSize);
}

/**
 * Validate SMS content
 */
export function validateSmsContent(content: string): SmsValidationResult {
  const issues: string[] = [];
  const characterCount = content.length;
  const segmentCount = calculateSegmentCount(content);
  const isUnicode = containsUnicode(content);

  // Check for empty content
  if (characterCount === 0) {
    issues.push('Content cannot be empty');
  }

  // Warn about Unicode
  if (isUnicode) {
    issues.push('Content contains special characters that reduce message capacity');
  }

  // Warn about multi-segment messages
  if (segmentCount > 1) {
    issues.push(`Message will be sent as ${segmentCount} segments (additional costs may apply)`);
  }

  // Warn if very long
  if (segmentCount > 4) {
    issues.push('Consider shortening your message to reduce costs');
  }

  return {
    isValid: characterCount > 0,
    characterCount,
    segmentCount,
    issues,
  };
}

/**
 * Render template with variables
 */
export function renderTemplate(content: string, variables: Record<string, string | null | undefined>): string {
  let rendered = content;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    const replacement = value ?? '';
    rendered = rendered.split(placeholder).join(replacement);
  }

  return rendered;
}

/**
 * Extract template variables from content
 */
export function extractTemplateVariables(content: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  content: string,
  providedVariables: Record<string, unknown>
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(content);
  const missing = required.filter(v => !(v in providedVariables));

  return {
    valid: missing.length === 0,
    missing,
  };
}

// =============================================================================
// Export Service Object
// =============================================================================

export const templateService = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  hardDeleteTemplate,
  validateSmsContent,
  renderTemplate,
  extractTemplateVariables,
  validateTemplateVariables,
};

export default templateService;
