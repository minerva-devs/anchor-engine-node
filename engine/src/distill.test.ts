/**
 * Unit tests for distillation functionality
 */

import { distillSchema } from './schemas/api-schemas.js';

describe('Distillation API Schema Validation', () => {
  test('should validate valid distill request', () => {
    const validRequest = {
      seed: {
        query: 'test query',
        global: false
      },
      radius: 5,
      max_nodes: 100,
      output_format: 'yaml',
      normalization: 'strict'
    };

    const result = distillSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should validate seed object with query', () => {
    const validRequest = {
      seed: {
        query: 'test query'
      },
      radius: 5
    };

    const result = distillSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should validate seed object with global flag', () => {
    const validRequest = {
      seed: {
        global: true
      },
      radius: 5
    };

    const result = distillSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  test('should validate distill request with minimal required fields', () => {
    // Since radius has a default, even an empty object should be valid
    const minimalRequest = {};

    const result = distillSchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);
  });

  test('should validate radius as positive number', () => {
    const invalidRequest = {
      seed: {
        query: 'test query'
      },
      radius: -5 // negative should be invalid
    };

    const result = distillSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['radius'],
          message: expect.stringContaining('Too small')
        })
      );
    }
  });

  test('should validate max_nodes as positive number', () => {
    const invalidRequest = {
      seed: {
        query: 'test query'
      },
      radius: 5,
      max_nodes: 0 // zero should be invalid
    };

    const result = distillSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['max_nodes'],
          message: expect.stringContaining('Too small')
        })
      );
    }
  });

  test('should validate output_format enum', () => {
    const invalidRequest = {
      seed: {
        query: 'test query'
      },
      radius: 5,
      output_format: 'invalid_format' // not in enum
    };

    const result = distillSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['output_format'],
          message: expect.stringContaining('Invalid option')
        })
      );
    }
  });

  test('should validate normalization enum', () => {
    const invalidRequest = {
      seed: {
        query: 'test query'
      },
      radius: 5,
      normalization: 'invalid_normalization' // not in enum
    };

    const result = distillSchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toContainEqual(
        expect.objectContaining({
          path: ['normalization'],
          message: expect.stringContaining('Invalid option')
        })
      );
    }
  });
});