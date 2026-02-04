/**
 * Phone Utility Tests
 */

import { describe, it, expect } from 'vitest';
import {
  isValidE164,
  formatToE164,
  validateE164,
  maskPhone,
  formatForDisplay,
  extractDigits,
  phonesMatch,
} from '../phone';

describe('isValidE164', () => {
  it('should return true for valid E.164 numbers', () => {
    expect(isValidE164('+14155551234')).toBe(true);
    expect(isValidE164('+442071234567')).toBe(true);
    expect(isValidE164('+8613812345678')).toBe(true);
  });

  it('should return false for numbers without +', () => {
    expect(isValidE164('14155551234')).toBe(false);
  });

  it('should return false for numbers with formatting', () => {
    expect(isValidE164('+1-415-555-1234')).toBe(false);
    expect(isValidE164('+1 (415) 555-1234')).toBe(false);
  });

  it('should return false for numbers starting with +0', () => {
    expect(isValidE164('+04155551234')).toBe(false);
  });

  it('should return false for empty or invalid input', () => {
    expect(isValidE164('')).toBe(false);
    expect(isValidE164('+')).toBe(false);
    expect(isValidE164('phone')).toBe(false);
  });
});

describe('formatToE164', () => {
  it('should return valid E.164 numbers unchanged', () => {
    expect(formatToE164('+14155551234')).toBe('+14155551234');
  });

  it('should format US numbers with dashes', () => {
    expect(formatToE164('415-555-1234')).toBe('+14155551234');
  });

  it('should format US numbers with parentheses', () => {
    expect(formatToE164('(415) 555-1234')).toBe('+14155551234');
  });

  it('should format US numbers with dots', () => {
    expect(formatToE164('415.555.1234')).toBe('+14155551234');
  });

  it('should format US numbers with country code', () => {
    expect(formatToE164('+1 415 555 1234')).toBe('+14155551234');
    expect(formatToE164('1-415-555-1234')).toBe('+14155551234');
  });

  it('should handle 10-digit US numbers', () => {
    expect(formatToE164('4155551234')).toBe('+14155551234');
  });

  it('should return null for invalid numbers', () => {
    expect(formatToE164('invalid')).toBeNull();
    expect(formatToE164('123')).toBeNull();
    expect(formatToE164('')).toBeNull();
  });
});

describe('validateE164', () => {
  it('should return valid result for correct numbers', () => {
    const result = validateE164('415-555-1234');
    expect(result.valid).toBe(true);
    expect(result.formatted).toBe('+14155551234');
    expect(result.error).toBeUndefined();
  });

  it('should return error for invalid numbers', () => {
    const result = validateE164('invalid');
    expect(result.valid).toBe(false);
    expect(result.formatted).toBeUndefined();
    expect(result.error).toBe('Invalid phone number format');
  });

  it('should return error for empty input', () => {
    const result = validateE164('');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Phone number is required');
  });

  it('should return error for whitespace-only input', () => {
    const result = validateE164('   ');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Phone number is required');
  });
});

describe('maskPhone', () => {
  it('should mask all but last 4 digits', () => {
    expect(maskPhone('+14155551234')).toBe('+*******1234');
    expect(maskPhone('4155551234')).toBe('******1234');
  });

  it('should handle short numbers', () => {
    expect(maskPhone('123')).toBe('****');
    expect(maskPhone('')).toBe('****');
  });

  it('should preserve plus sign', () => {
    const masked = maskPhone('+14155551234');
    expect(masked.startsWith('+')).toBe(true);
  });
});

describe('formatForDisplay', () => {
  it('should format US E.164 numbers', () => {
    expect(formatForDisplay('+14155551234')).toBe('(415) 555-1234');
  });

  it('should return non-US numbers unchanged', () => {
    expect(formatForDisplay('+442071234567')).toBe('+442071234567');
  });

  it('should handle empty input', () => {
    expect(formatForDisplay('')).toBe('');
  });
});

describe('extractDigits', () => {
  it('should extract only digits', () => {
    expect(extractDigits('+1 (415) 555-1234')).toBe('14155551234');
    expect(extractDigits('415.555.1234')).toBe('4155551234');
  });

  it('should handle numbers without formatting', () => {
    expect(extractDigits('14155551234')).toBe('14155551234');
  });
});

describe('phonesMatch', () => {
  it('should match equivalent numbers in different formats', () => {
    expect(phonesMatch('+14155551234', '(415) 555-1234')).toBe(true);
    expect(phonesMatch('415-555-1234', '4155551234')).toBe(true);
  });

  it('should not match different numbers', () => {
    expect(phonesMatch('+14155551234', '+14155551235')).toBe(false);
  });

  it('should handle edge cases', () => {
    // Same digits match even if not valid phone numbers
    expect(phonesMatch('invalid1', 'invalid1')).toBe(true);
    // Different digits don't match
    expect(phonesMatch('invalid1', 'invalid2')).toBe(false);
  });
});
