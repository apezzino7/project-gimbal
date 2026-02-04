/**
 * Phone Number Validation and Formatting Utilities
 * Handles E.164 format validation and conversion for SMS delivery
 */

// E.164 format: + followed by 1-15 digits
const E164_REGEX = /^\+[1-9]\d{1,14}$/;

// US phone number patterns (with or without country code)
const US_PHONE_REGEX =
  /^(\+?1)?[-.\s]?\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})$/;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Checks if a phone number is in valid E.164 format
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 *
 * @example
 * isValidE164('+14155551234') // true
 * isValidE164('4155551234')   // false
 * isValidE164('+1-415-555-1234') // false (has formatting)
 */
export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/**
 * Formats a phone number to E.164 format
 * Currently supports US numbers. Returns null if cannot be formatted.
 *
 * @param phone - Phone number in various formats
 * @param defaultCountry - Default country code (default: 'US')
 * @returns E.164 formatted number or null if invalid
 *
 * @example
 * formatToE164('415-555-1234')     // '+14155551234'
 * formatToE164('(415) 555-1234')   // '+14155551234'
 * formatToE164('+1 415 555 1234')  // '+14155551234'
 * formatToE164('invalid')          // null
 */
export function formatToE164(
  phone: string,
  defaultCountry = 'US'
): string | null {
  // Remove all whitespace
  const cleaned = phone.trim();

  // Already E.164 format
  if (isValidE164(cleaned)) {
    return cleaned;
  }

  // Try to parse as US number
  if (defaultCountry === 'US') {
    const usMatch = cleaned.match(US_PHONE_REGEX);
    if (usMatch) {
      const [, , areaCode, exchange, subscriber] = usMatch;
      return `+1${areaCode}${exchange}${subscriber}`;
    }
  }

  return null;
}

// =============================================================================
// Validation Result Type
// =============================================================================

export interface PhoneValidationResult {
  valid: boolean;
  formatted?: string;
  error?: string;
}

/**
 * Validates a phone number and returns a result object
 * @param phone - Phone number to validate
 * @param defaultCountry - Default country for formatting (default: 'US')
 * @returns Validation result with formatted number or error
 *
 * @example
 * validateE164('415-555-1234')
 * // { valid: true, formatted: '+14155551234' }
 *
 * validateE164('invalid')
 * // { valid: false, error: 'Invalid phone number format' }
 */
export function validateE164(
  phone: string,
  defaultCountry = 'US'
): PhoneValidationResult {
  if (!phone || phone.trim().length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  const formatted = formatToE164(phone, defaultCountry);

  if (formatted) {
    return { valid: true, formatted };
  }

  return { valid: false, error: 'Invalid phone number format' };
}

// =============================================================================
// Display Formatting
// =============================================================================

/**
 * Masks a phone number for display (shows last 4 digits)
 * @param phone - Phone number to mask
 * @returns Masked phone number
 *
 * @example
 * maskPhone('+14155551234') // '+1******1234'
 * maskPhone('4155551234')   // '******1234'
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 4) {
    return '****';
  }

  const lastFour = phone.slice(-4);
  const prefix = phone.slice(0, -4);
  const masked = prefix.replace(/\d/g, '*');

  return masked + lastFour;
}

/**
 * Formats a phone number for display (US format)
 * @param phone - E.164 phone number
 * @returns Formatted display string
 *
 * @example
 * formatForDisplay('+14155551234') // '(415) 555-1234'
 * formatForDisplay('+442071234567') // '+442071234567' (non-US unchanged)
 */
export function formatForDisplay(phone: string): string {
  if (!phone) return '';

  // US number in E.164
  if (phone.startsWith('+1') && phone.length === 12) {
    const digits = phone.slice(2);
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Return as-is for non-US numbers
  return phone;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Extracts just the digits from a phone number
 * @param phone - Phone number with potential formatting
 * @returns Only the digits
 *
 * @example
 * extractDigits('+1 (415) 555-1234') // '14155551234'
 */
export function extractDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Checks if two phone numbers are equivalent
 * @param phone1 - First phone number
 * @param phone2 - Second phone number
 * @returns true if they represent the same number
 *
 * @example
 * phonesMatch('+14155551234', '(415) 555-1234') // true
 */
export function phonesMatch(phone1: string, phone2: string): boolean {
  const formatted1 = formatToE164(phone1);
  const formatted2 = formatToE164(phone2);

  if (!formatted1 || !formatted2) {
    // Fall back to digit comparison
    return extractDigits(phone1) === extractDigits(phone2);
  }

  return formatted1 === formatted2;
}
