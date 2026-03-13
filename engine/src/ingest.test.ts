/**
 * Unit tests for ingestion functionality
 */

import { ingestSchema } from './schemas/api-schemas.js';

describe('Ingest API Schema Validation', () => {
  test('should validate valid ingest request', () => {
    const validRequest = {
      content: 'test content',
      source: 'test-source',
      type: 'markdown',
      bucket: 'test-bucket',
      tags: ['#test', '#tag'],
      provenance: 'internal'
    };

    const result = ingestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should reject ingest request without content', () => {
    const invalidRequest = {
      source: 'test-source'
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['content'],
          message: 'Invalid input: expected string, received undefined'
        })
      );
    }
  });

  test('should validate content as string', () => {
    const invalidRequest = {
      content: 12345, // should be string
      source: 'test-source'
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['content'],
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate source as string', () => {
    const invalidRequest = {
      content: 'test content',
      source: 12345 // should be string
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['source'],
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate type enum', () => {
    const invalidRequest = {
      content: 'test content',
      source: 'test-source',
      type: 'invalid-type' // not in enum
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['type'],
          message: expect.stringContaining('Invalid option')
        })
      );
    }
  });

  test('should validate bucket as string', () => {
    const invalidRequest = {
      content: 'test content',
      source: 'test-source',
      bucket: 12345 // should be string
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['bucket'],
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate tags as array of strings', () => {
    const invalidRequest = {
      content: 'test content',
      source: 'test-source',
      tags: [123, '#valid-tag'] // first element is number, should be string
    };

    const result = ingestSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['tags', 0], // Zod uses numeric indices
          message: 'Invalid input: expected string, received number'
        })
      );
    }
  });

  test('should validate provenance as optional field', () => {
    // The ingestSchema doesn't include provenance, so adding it should not affect validation
    const validRequest = {
      content: 'test content',
      source: 'test-source',
      provenance: 'internal' // This should be ignored since it's not in the schema
    };

    const result = ingestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should validate hash as string when provided', () => {
    const validRequest = {
      content: 'test content',
      source: 'test-source',
      hash: 'abc123def456' // optional field, but should be string if provided
    };

    const result = ingestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should validate hash as string when provided', () => {
    const validRequest = {
      content: 'test content',
      source: 'test-source',
      hash: 'abc123def456' // optional field, but should be string if provided
    };

    const result = ingestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should allow additional properties', () => {
    // The schema should allow additional properties that aren't explicitly defined
    const validRequest = {
      content: 'test content',
      source: 'test-source',
      additionalField: 'some value' // This should be allowed
    };

    const result = ingestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });
});