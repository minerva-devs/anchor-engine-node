/**
 * Unit tests for search functionality
 */

import { validate } from 'zod';
import { searchSchema } from './schemas/api-schemas.js';

describe('Search API Schema Validation', () => {
  test('should validate valid search request', () => {
    const validRequest = {
      query: 'test query',
      max_chars: 5000,
      buckets: ['test'],
      provenance: 'all',
      strategy: 'standard',
      batch_size: 20
    };

    const result = searchSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should reject search request without query', () => {
    const invalidRequest = {
      max_chars: 5000
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['query'],
          message: 'Invalid input: expected string, received undefined'
        })
      );
    }
  });

  test('should validate query as string', () => {
    const invalidRequest = {
      query: 12345, // should be string
      max_chars: 5000
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['query'],
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate max_chars as positive number', () => {
    const invalidRequest = {
      query: 'test query',
      max_chars: -100 // negative should be invalid
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['max_chars'],
          message: expect.stringContaining('Too small')
        })
      );
    }
  });

  test('should validate buckets as array of strings', () => {
    const invalidRequest = {
      query: 'test query',
      buckets: [123, 'valid_bucket'] // first element is number, should be string
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['buckets', 0], // Zod uses numeric indices, not string
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate provenance enum', () => {
    const invalidRequest = {
      query: 'test query',
      provenance: 'invalid_provenance' // not in enum
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['provenance'],
          message: expect.stringContaining('Invalid option')
        })
      );
    }
  });

  test('should validate strategy enum', () => {
    const invalidRequest = {
      query: 'test query',
      strategy: 'invalid_strategy' // not in enum
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['strategy'],
          message: expect.stringContaining('Invalid option')
        })
      );
    }
  });

  test('should validate batch_size range', () => {
    const invalidRequest = {
      query: 'test query',
      batch_size: 150 // too large, max is 100
    };

    const result = searchSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['batch_size'],
          message: expect.stringContaining('Too big')
        })
      );
    }
  });
});