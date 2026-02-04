/**
 * Member Import Service
 *
 * Handles CSV import, data cleaning, duplicate detection,
 * and batch member creation with transaction and visit history support.
 */

import { supabase } from '@/lib/supabase';
import {
  detectColumnType,
  applyColumnRules,
} from '../data-sources/cleaningService';
import type { CleaningRule, DetectedType } from '@/types/dataImport';
import type {
  CreateMemberInput,
  MemberImportConfig,
  MemberImportResult,
  MemberImportMapping,
  AcquisitionSource,
  MembershipStatus,
} from '@/types/member';

// =============================================================================
// Types
// =============================================================================

export interface ParsedCSVData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface ColumnPreview {
  name: string;
  detectedType: DetectedType;
  sampleValues: string[];
  nullCount: number;
  uniqueCount: number;
}

export interface ImportPreview {
  columns: ColumnPreview[];
  rows: Record<string, unknown>[];
  totalRows: number;
}

export interface ImportProgress {
  phase: 'parsing' | 'validating' | 'processing' | 'complete' | 'error';
  processed: number;
  total: number;
  errors: Array<{ row: number; field?: string; message: string }>;
}

type ImportProgressCallback = (progress: ImportProgress) => void;

// =============================================================================
// CSV Parsing
// =============================================================================

/**
 * Parse CSV content into headers and rows
 */
export function parseCSV(content: string, delimiter = ','): ParsedCSVData {
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = parseCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => parseCSVLine(line, delimiter));

  return {
    headers,
    rows: rows.filter((row) => row.some((cell) => cell.trim())), // Filter empty rows
    totalRows: rows.length,
  };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Read and parse a CSV file
 */
export async function parseCSVFile(file: File): Promise<ParsedCSVData> {
  const content = await file.text();
  return parseCSV(content);
}

// =============================================================================
// Column Preview & Detection
// =============================================================================

/**
 * Generate preview data for column mapping
 */
export function generatePreview(data: ParsedCSVData, maxRows = 10): ImportPreview {
  const columns: ColumnPreview[] = data.headers.map((header, index) => {
    const values = data.rows.map((row) => row[index] || '');
    const { type } = detectColumnType(values);

    const uniqueValues = new Set(values.filter((v) => v !== ''));
    const nullCount = values.filter((v) => v === '' || v == null).length;

    return {
      name: header,
      detectedType: type,
      sampleValues: values.slice(0, 5).filter((v) => v !== ''),
      nullCount,
      uniqueCount: uniqueValues.size,
    };
  });

  const rows = data.rows.slice(0, maxRows).map((row) => {
    const obj: Record<string, unknown> = {};
    data.headers.forEach((header, i) => {
      obj[header] = row[i] || null;
    });
    return obj;
  });

  return {
    columns,
    rows,
    totalRows: data.totalRows,
  };
}

// =============================================================================
// Field Mapping Suggestions
// =============================================================================

const MEMBER_FIELD_PATTERNS: Record<keyof CreateMemberInput, RegExp[]> = {
  firstName: [/first.?name/i, /fname/i, /given.?name/i],
  lastName: [/last.?name/i, /lname/i, /surname/i, /family.?name/i],
  email: [/email/i, /e.?mail/i],
  phone: [/phone/i, /mobile/i, /cell/i, /tel/i],
  dateOfBirth: [/dob/i, /birth.?date/i, /date.?of.?birth/i, /birthday/i],
  gender: [/gender/i, /sex/i],
  addressLine1: [/address.?1/i, /address.?line.?1/i, /street/i],
  addressLine2: [/address.?2/i, /address.?line.?2/i, /apt/i, /suite/i, /unit/i],
  city: [/city/i, /town/i],
  state: [/state/i, /province/i],
  postalCode: [/zip/i, /postal/i, /post.?code/i],
  country: [/country/i],
  membershipStartDate: [/start.?date/i, /join.?date/i, /member.?since/i],
  membershipExpiryDate: [/expir/i, /end.?date/i, /renewal/i],
  membershipStatus: [/status/i],
  externalId: [/external.?id/i, /member.?id/i, /id/i, /customer.?id/i],
  membershipLevelId: [/level/i, /tier/i, /membership.?type/i],
  acquisitionSource: [/source/i, /acquisition/i, /channel/i],
  acquisitionPromoCode: [/promo/i, /coupon/i, /discount.?code/i],
  acquisitionCost: [/cost/i, /cac/i],
  acquisitionDate: [/acquisition.?date/i],
  acquisitionCampaignId: [/campaign/i],
  tags: [/tag/i],
  customFields: [],
  siteId: [/site/i, /location/i],
  sourceImportId: [],
};

/**
 * Suggest field mappings based on column names
 */
export function suggestFieldMappings(
  headers: string[]
): MemberImportMapping[] {
  return headers.map((header) => {
    let suggestedField: keyof CreateMemberInput | 'skip' = 'skip';

    for (const [field, patterns] of Object.entries(MEMBER_FIELD_PATTERNS)) {
      if (patterns.some((pattern) => pattern.test(header))) {
        suggestedField = field as keyof CreateMemberInput;
        break;
      }
    }

    return {
      sourceColumn: header,
      targetField: suggestedField,
      transformRules: [],
    };
  });
}

// =============================================================================
// Data Transformation
// =============================================================================

/**
 * Transform a row into a member input based on mappings
 */
function transformRowToMember(
  row: string[],
  headers: string[],
  mappings: MemberImportMapping[],
  config: MemberImportConfig
): CreateMemberInput {
  const member: CreateMemberInput = {
    siteId: config.siteId,
    membershipLevelId: config.defaultMembershipLevelId,
    acquisitionSource: config.defaultAcquisitionSource,
    tags: config.defaultTags || [],
    membershipStatus: 'active' as MembershipStatus,
  };

  // Apply mappings
  for (const mapping of mappings) {
    if (mapping.targetField === 'skip') continue;

    const columnIndex = headers.indexOf(mapping.sourceColumn);
    if (columnIndex === -1) continue;

    let value: unknown = row[columnIndex];

    // Apply cleaning rules if any
    if (mapping.transformRules && mapping.transformRules.length > 0) {
      const rules = mapping.transformRules.map((r) => JSON.parse(r) as CleaningRule);
      const result = applyColumnRules(value, rules);
      if (result.skip) continue;
      value = result.value;
    }

    // Type-specific transformations
    switch (mapping.targetField) {
      case 'email':
        member.email = value ? String(value).toLowerCase().trim() : null;
        break;
      case 'phone':
        member.phone = formatPhone(value);
        break;
      case 'dateOfBirth':
      case 'membershipStartDate':
      case 'membershipExpiryDate':
      case 'acquisitionDate':
        member[mapping.targetField] = parseDate(value);
        break;
      case 'acquisitionCost':
        member.acquisitionCost = parseNumber(value);
        break;
      case 'membershipStatus':
        member.membershipStatus = parseMembershipStatus(value);
        break;
      case 'acquisitionSource':
        member.acquisitionSource = parseAcquisitionSource(value);
        break;
      case 'tags':
        const newTags = String(value || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        member.tags = [...(member.tags || []), ...newTags];
        break;
      default:
        if (mapping.targetField in member) {
          (member as unknown as Record<string, unknown>)[mapping.targetField] = value || null;
        }
    }
  }

  return member;
}

/**
 * Format phone to E.164 format
 */
function formatPhone(value: unknown): string | null {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return digits.length >= 10 ? `+${digits}` : null;
}

/**
 * Parse date string to ISO format
 */
function parseDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];
}

/**
 * Parse number from string
 */
function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = parseFloat(String(value).replace(/[$,]/g, ''));
  return isNaN(num) ? null : num;
}

/**
 * Parse membership status
 */
function parseMembershipStatus(value: unknown): MembershipStatus {
  if (!value) return 'active';
  const str = String(value).toLowerCase().trim();
  const statusMap: Record<string, MembershipStatus> = {
    active: 'active',
    expired: 'expired',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    suspended: 'suspended',
    pending: 'pending',
  };
  return statusMap[str] || 'active';
}

/**
 * Parse acquisition source
 */
function parseAcquisitionSource(value: unknown): AcquisitionSource | null {
  if (!value) return null;
  const str = String(value).toLowerCase().trim().replace(/\s+/g, '_');
  const sourceMap: Record<string, AcquisitionSource> = {
    campaign: 'campaign',
    promo_code: 'promo_code',
    promo: 'promo_code',
    referral: 'referral',
    organic: 'organic',
    import: 'import',
    api: 'api',
  };
  return sourceMap[str] || 'import';
}

// =============================================================================
// Duplicate Detection
// =============================================================================

/**
 * Check for duplicate members
 */
async function findDuplicateMember(
  siteId: string,
  email: string | null,
  phone: string | null,
  externalId: string | null,
  matchFields: ('email' | 'phone' | 'externalId')[]
): Promise<string | null> {
  if (matchFields.length === 0) return null;

  const conditions: string[] = [];

  if (matchFields.includes('email') && email) {
    conditions.push(`email.eq.${email.toLowerCase()}`);
  }
  if (matchFields.includes('phone') && phone) {
    conditions.push(`phone.eq.${phone}`);
  }
  if (matchFields.includes('externalId') && externalId) {
    conditions.push(`external_id.eq.${externalId}`);
  }

  if (conditions.length === 0) return null;

  const { data, error } = await supabase
    .from('members')
    .select('id')
    .eq('site_id', siteId)
    .eq('is_active', true)
    .or(conditions.join(','))
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0].id;
}

// =============================================================================
// Batch Import
// =============================================================================

/**
 * Import members from parsed CSV data
 */
export async function importMembers(
  data: ParsedCSVData,
  mappings: MemberImportMapping[],
  config: MemberImportConfig,
  onProgress?: ImportProgressCallback
): Promise<MemberImportResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const result: MemberImportResult = {
    totalRows: data.rows.length,
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const importId = `import_${Date.now()}`;

  onProgress?.({
    phase: 'processing',
    processed: 0,
    total: data.rows.length,
    errors: [],
  });

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < data.rows.length; i += batchSize) {
    const batch = data.rows.slice(i, i + batchSize);

    for (let j = 0; j < batch.length; j++) {
      const rowIndex = i + j;
      const row = batch[j];

      try {
        // Transform row to member
        const memberInput = transformRowToMember(row, data.headers, mappings, config);
        memberInput.sourceImportId = importId;

        // Check for required fields
        if (!memberInput.email && !memberInput.phone && !memberInput.externalId) {
          result.errors.push({
            row: rowIndex + 2, // +2 for 1-indexed and header row
            field: 'email/phone/externalId',
            message: 'At least one identifier (email, phone, or external ID) is required',
          });
          result.failed++;
          continue;
        }

        // Check for duplicates
        const existingId = await findDuplicateMember(
          config.siteId,
          memberInput.email ?? null,
          memberInput.phone ?? null,
          memberInput.externalId ?? null,
          config.matchFields
        );

        if (existingId) {
          switch (config.duplicateHandling) {
            case 'skip':
              result.skipped++;
              continue;
            case 'update':
              await supabase
                .from('members')
                .update({
                  ...transformMemberToDbRow(memberInput),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingId);
              result.updated++;
              continue;
            case 'create_new':
              // Fall through to create
              break;
          }
        }

        // Create new member
        const { error: insertError } = await supabase.from('members').insert({
          user_id: user.id,
          ...transformMemberToDbRow(memberInput),
        });

        if (insertError) {
          result.errors.push({
            row: rowIndex + 2,
            field: 'database',
            message: insertError.message,
          });
          result.failed++;
        } else {
          result.imported++;
        }
      } catch (err) {
        result.errors.push({
          row: rowIndex + 2,
          field: 'unknown',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
        result.failed++;
      }

      // Update progress
      onProgress?.({
        phase: 'processing',
        processed: rowIndex + 1,
        total: data.rows.length,
        errors: result.errors.slice(-10), // Last 10 errors
      });
    }
  }

  onProgress?.({
    phase: 'complete',
    processed: data.rows.length,
    total: data.rows.length,
    errors: result.errors,
  });

  return result;
}

/**
 * Transform member input to database row format
 */
function transformMemberToDbRow(input: CreateMemberInput): Record<string, unknown> {
  return {
    site_id: input.siteId,
    membership_level_id: input.membershipLevelId || null,
    external_id: input.externalId || null,
    first_name: input.firstName || null,
    last_name: input.lastName || null,
    email: input.email?.toLowerCase() || null,
    phone: input.phone || null,
    date_of_birth: input.dateOfBirth || null,
    gender: input.gender || null,
    address_line1: input.addressLine1 || null,
    address_line2: input.addressLine2 || null,
    city: input.city || null,
    state: input.state || null,
    postal_code: input.postalCode || null,
    country: input.country || 'US',
    membership_start_date: input.membershipStartDate || null,
    membership_expiry_date: input.membershipExpiryDate || null,
    membership_status: input.membershipStatus || 'active',
    acquisition_source: input.acquisitionSource || 'import',
    acquisition_campaign_id: input.acquisitionCampaignId || null,
    acquisition_promo_code: input.acquisitionPromoCode || null,
    acquisition_cost: input.acquisitionCost || null,
    acquisition_date: input.acquisitionDate || new Date().toISOString().split('T')[0],
    tags: input.tags || [],
    custom_fields: input.customFields || {},
    source_import_id: input.sourceImportId || null,
  };
}

// =============================================================================
// Transaction Import
// =============================================================================

/**
 * Import transactions for existing members
 */
export async function importTransactions(
  data: ParsedCSVData,
  memberIdColumn: string,
  dateColumn: string,
  amountColumn: string,
  typeColumn?: string,
  siteId?: string,
  onProgress?: ImportProgressCallback
): Promise<{ imported: number; failed: number; errors: Array<{ row: number; message: string }> }> {
  const result = { imported: 0, failed: 0, errors: [] as Array<{ row: number; message: string }> };

  const memberIdIndex = data.headers.indexOf(memberIdColumn);
  const dateIndex = data.headers.indexOf(dateColumn);
  const amountIndex = data.headers.indexOf(amountColumn);
  const typeIndex = typeColumn ? data.headers.indexOf(typeColumn) : -1;

  if (memberIdIndex === -1 || dateIndex === -1 || amountIndex === -1) {
    throw new Error('Required columns not found');
  }

  const importId = `txn_import_${Date.now()}`;

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];

    try {
      const memberId = row[memberIdIndex];
      const date = parseDate(row[dateIndex]);
      const amount = parseNumber(row[amountIndex]);
      const type = typeIndex >= 0 ? row[typeIndex] : 'purchase';

      if (!memberId || !date || amount === null) {
        result.errors.push({ row: i + 2, message: 'Missing required fields' });
        result.failed++;
        continue;
      }

      // Find member by external ID or UUID
      let memberUuid = memberId;
      if (!/^[0-9a-f-]{36}$/i.test(memberId)) {
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('external_id', memberId)
          .eq('is_active', true)
          .single();

        if (!member) {
          result.errors.push({ row: i + 2, message: `Member not found: ${memberId}` });
          result.failed++;
          continue;
        }
        memberUuid = member.id;
      }

      const { error } = await supabase.from('member_transactions').insert({
        member_id: memberUuid,
        site_id: siteId,
        transaction_date: date,
        amount,
        transaction_type: type,
        source_import_id: importId,
      });

      if (error) {
        result.errors.push({ row: i + 2, message: error.message });
        result.failed++;
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      result.failed++;
    }

    onProgress?.({
      phase: 'processing',
      processed: i + 1,
      total: data.rows.length,
      errors: result.errors.slice(-10),
    });
  }

  return result;
}

// =============================================================================
// Visit Import
// =============================================================================

/**
 * Import visits for existing members
 */
export async function importVisits(
  data: ParsedCSVData,
  memberIdColumn: string,
  dateColumn: string,
  siteId: string,
  timeColumn?: string,
  typeColumn?: string,
  onProgress?: ImportProgressCallback
): Promise<{ imported: number; failed: number; errors: Array<{ row: number; message: string }> }> {
  const result = { imported: 0, failed: 0, errors: [] as Array<{ row: number; message: string }> };

  const memberIdIndex = data.headers.indexOf(memberIdColumn);
  const dateIndex = data.headers.indexOf(dateColumn);
  const timeIndex = timeColumn ? data.headers.indexOf(timeColumn) : -1;
  const typeIndex = typeColumn ? data.headers.indexOf(typeColumn) : -1;

  if (memberIdIndex === -1 || dateIndex === -1) {
    throw new Error('Required columns not found');
  }

  const importId = `visit_import_${Date.now()}`;

  for (let i = 0; i < data.rows.length; i++) {
    const row = data.rows[i];

    try {
      const memberId = row[memberIdIndex];
      const date = parseDate(row[dateIndex]);
      const time = timeIndex >= 0 ? row[timeIndex] : null;
      const type = typeIndex >= 0 ? row[typeIndex] : 'regular';

      if (!memberId || !date) {
        result.errors.push({ row: i + 2, message: 'Missing required fields' });
        result.failed++;
        continue;
      }

      // Find member
      let memberUuid = memberId;
      if (!/^[0-9a-f-]{36}$/i.test(memberId)) {
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('external_id', memberId)
          .eq('is_active', true)
          .single();

        if (!member) {
          result.errors.push({ row: i + 2, message: `Member not found: ${memberId}` });
          result.failed++;
          continue;
        }
        memberUuid = member.id;
      }

      const { error } = await supabase.from('member_visits').insert({
        member_id: memberUuid,
        site_id: siteId,
        visit_date: date,
        check_in_time: time ? `${date}T${time}` : null,
        visit_type: type,
        source_import_id: importId,
      });

      if (error) {
        result.errors.push({ row: i + 2, message: error.message });
        result.failed++;
      } else {
        result.imported++;
      }
    } catch (err) {
      result.errors.push({
        row: i + 2,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      result.failed++;
    }

    onProgress?.({
      phase: 'processing',
      processed: i + 1,
      total: data.rows.length,
      errors: result.errors.slice(-10),
    });
  }

  return result;
}

// =============================================================================
// Exports
// =============================================================================

export const memberImportService = {
  // CSV Parsing
  parseCSV,
  parseCSVFile,

  // Preview
  generatePreview,
  suggestFieldMappings,

  // Import
  importMembers,
  importTransactions,
  importVisits,
};

export default memberImportService;
