import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  sanitizeEmail,
  getPasswordStrength,
  getPasswordStrengthLabel,
} from '../validation';

describe('validatePassword', () => {
  it('should reject passwords shorter than 8 characters', () => {
    const result = validatePassword('Short1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters long');
  });

  it('should reject passwords without uppercase letters', () => {
    const result = validatePassword('lowercase1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });

  it('should reject passwords without lowercase letters', () => {
    const result = validatePassword('UPPERCASE1!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one lowercase letter');
  });

  it('should reject passwords without numbers', () => {
    const result = validatePassword('NoNumbers!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one number');
  });

  it('should reject passwords without special characters', () => {
    const result = validatePassword('NoSpecial1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one special character');
  });

  it('should accept valid passwords', () => {
    const result = validatePassword('ValidPass1!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return multiple errors for weak passwords', () => {
    const result = validatePassword('weak');
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('sanitizeEmail', () => {
  it('should trim whitespace', () => {
    expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
  });

  it('should convert to lowercase', () => {
    expect(sanitizeEmail('Test@EXAMPLE.COM')).toBe('test@example.com');
  });

  it('should handle already clean emails', () => {
    expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
  });

  it('should handle empty strings', () => {
    expect(sanitizeEmail('')).toBe('');
  });
});

describe('getPasswordStrength', () => {
  it('should return 0 for very weak passwords', () => {
    expect(getPasswordStrength('a')).toBe(0);
  });

  it('should return 1 for passwords with 8+ characters only', () => {
    expect(getPasswordStrength('aaaaaaaa')).toBe(1);
  });

  it('should return higher scores for longer passwords', () => {
    const short = getPasswordStrength('Aa1!aaaa');
    const long = getPasswordStrength('Aa1!aaaaaaaaa');
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it('should return 4 for strong passwords', () => {
    expect(getPasswordStrength('VeryStrong1!')).toBe(4);
  });

  it('should cap at 4', () => {
    expect(getPasswordStrength('ExtremelyStrongPassword123!@#')).toBe(4);
  });
});

describe('getPasswordStrengthLabel', () => {
  it('should return Weak for 0', () => {
    expect(getPasswordStrengthLabel(0)).toBe('Weak');
  });

  it('should return Fair for 1', () => {
    expect(getPasswordStrengthLabel(1)).toBe('Fair');
  });

  it('should return Good for 2', () => {
    expect(getPasswordStrengthLabel(2)).toBe('Good');
  });

  it('should return Strong for 3', () => {
    expect(getPasswordStrengthLabel(3)).toBe('Strong');
  });

  it('should return Very Strong for 4', () => {
    expect(getPasswordStrengthLabel(4)).toBe('Very Strong');
  });

  it('should return Weak for out of range values', () => {
    expect(getPasswordStrengthLabel(-1)).toBe('Weak');
    expect(getPasswordStrengthLabel(5)).toBe('Weak');
  });
});
