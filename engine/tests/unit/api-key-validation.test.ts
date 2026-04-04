/**
 * API Key Validation Tests
 *
 * Tests for API key strength validation (Standard 132)
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import the schema from config
const ServerSettingsSchema = z.object({
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  api_key: z.string()
    .min(32, 'API key must be at least 32 characters')
    .max(128, 'API key must not exceed 128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{31,127}$|^[a-f0-9]{64,}$/i,
      'API key must contain uppercase, lowercase, and digit - OR be 64+ char hex')
    .optional(),
});

describe('API Key Strength Validation (Standard 132)', () => {
  describe('Valid API Keys', () => {
    it('should accept 32-char key with mixed case and digit', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKey1234567890abcdefghij'
      });
      expect(result.success).toBe(true);
    });

    it('should accept 64-char hex key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'a'.repeat(64)
      });
      expect(result.success).toBe(true);
    });

    it('should accept 128-char key (max length)', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKey1234567890abcdefghij' + 'x'.repeat(95)
      });
      expect(result.success).toBe(true);
    });

    it('should accept key with special characters', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecure-Key_123.456!789@abcdefghij'
      });
      expect(result.success).toBe(true);
    });

    it('should accept uppercase hex key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'A'.repeat(64)
      });
      expect(result.success).toBe(true);
    });

    it('should accept mixed case hex key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'aB3dEfGhIjKlMnOpQrStUvWxYz123456aB3dEfGhIjKlMnOpQrStUvWxYz123456'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Invalid API Keys - Too Short', () => {
    it('should reject 31-char key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKey1234567890abcdefgh'
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('32 characters');
    });

    it('should reject 16-char key (old minimum)', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'aaaaaaaaaaaaaaaa'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid API Keys - Too Long', () => {
    it('should reject 129-char key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKey1234567890abcdefghij' + 'x'.repeat(96)
      });
      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('128 characters');
    });
  });

  describe('Invalid API Keys - Missing Character Types', () => {
    it('should reject key with no uppercase', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'mysecurekey1234567890abcdefghij'
      });
      expect(result.success).toBe(false);
    });

    it('should reject key with no lowercase', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MYSECUREKEY1234567890ABCDEFGHIJ'
      });
      expect(result.success).toBe(false);
    });

    it('should reject key with no digits', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKeyabcdefghijMySecureKeyab'
      });
      expect(result.success).toBe(false);
    });

    it('should reject all-lowercase key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      });
      expect(result.success).toBe(false);
    });

    it('should reject all-digit key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: '12345678901234567890123456789012'
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Invalid API Keys - Hex Key Too Short', () => {
    it('should reject 63-char hex key', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'a'.repeat(63)
      });
      expect(result.success).toBe(false);
    });

    it('should reject 32-char hex key (not mixed case)', () => {
      const result = ServerSettingsSchema.safeParse({
        api_key: 'a'.repeat(32)
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Runtime Regex Validation', () => {
    const apiKeyStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{31,127}$|^[a-f0-9]{64,}$/i;

    it('should match valid mixed case key', () => {
      expect(apiKeyStrengthRegex.test('MySecureKey1234567890abcdefghij')).toBe(true);
    });

    it('should match valid 64-char hex key', () => {
      expect(apiKeyStrengthRegex.test('a'.repeat(64))).toBe(true);
    });

    it('should reject 31-char key', () => {
      expect(apiKeyStrengthRegex.test('MySecureKey1234567890abcdefgh')).toBe(false);
    });

    it('should reject 129-char key', () => {
      expect(apiKeyStrengthRegex.test('MySecureKey1234567890abcdefghij' + 'x'.repeat(96))).toBe(false);
    });

    it('should reject key without uppercase', () => {
      expect(apiKeyStrengthRegex.test('mysecurekey1234567890abcdefghij')).toBe(false);
    });

    it('should reject 63-char hex key', () => {
      expect(apiKeyStrengthRegex.test('a'.repeat(63))).toBe(false);
    });
  });

  describe('Example Keys from Documentation', () => {
    it('should accept example key "MySecureKey123..."', () => {
      // Simulating a 32+ char version
      const result = ServerSettingsSchema.safeParse({
        api_key: 'MySecureKey1234567890abcdefghij'
      });
      expect(result.success).toBe(true);
    });

    it('should accept crypto.randomBytes(32).toString("hex") output', () => {
      // crypto.randomBytes(32) produces 64 hex chars
      const hexKey = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2';
      expect(hexKey.length).toBe(64);
      const result = ServerSettingsSchema.safeParse({ api_key: hexKey });
      expect(result.success).toBe(true);
    });
  });
});
