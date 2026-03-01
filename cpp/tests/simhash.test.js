/**
 * SimHash Test
 * 
 * Tests the native SimHash implementation for text fingerprinting.
 * Skipped if native modules are not available.
 */

import { describe, test, expect } from '@jest/globals';

describe('SimHash (Native)', () => {
  let AnchorCore;
  let core;

  beforeAll(async () => {
    try {
      const module = await import('../../engine/src/native/index.js');
      AnchorCore = module.AnchorCore;
    } catch (e) {
      console.warn('Native modules not available - skipping SimHash tests');
      AnchorCore = null;
    }
  });

  beforeEach(() => {
    if (AnchorCore) {
      core = new AnchorCore();
      core.init(':memory:');
    }
  });

  afterAll(() => {
    if (core) {
      core.destroy();
    }
  });

  test('should compute SimHash for text', () => {
    if (!AnchorCore) {
      console.warn('Skipping: native modules not available');
      return;
    }

    const text = "the quick brown fox jumps over the lazy dog";
    const hash = core.computeSimHash(text);

    expect(hash).toBeDefined();
    expect(typeof hash).toBe('bigint');
    expect(hash).toBeGreaterThan(0n);
  });

  test('should produce identical hashes for identical text', () => {
    if (!AnchorCore) {
      console.warn('Skipping: native modules not available');
      return;
    }

    const text = "the quick brown fox jumps over the lazy dog";
    const hash1 = core.computeSimHash(text);
    const hash2 = core.computeSimHash(text);

    expect(hash1).toBe(hash2);
  });

  test('should produce similar hashes for similar text', () => {
    if (!AnchorCore) {
      console.warn('Skipping: native modules not available');
      return;
    }

    const text1 = "the quick brown fox jumps over the lazy dog";
    const text2 = "the quick brown fox jumps over the lazy cat";

    const hash1 = core.computeSimHash(text1);
    const hash2 = core.computeSimHash(text2);

    // Hamming distance should be small for similar texts
    const hammingDistance = bitCount(hash1 ^ hash2);
    expect(hammingDistance).toBeLessThan(15);
  });

  test('should produce different hashes for different text', () => {
    if (!AnchorCore) {
      console.warn('Skipping: native modules not available');
      return;
    }

    const text1 = "the quick brown fox jumps over the lazy dog";
    const text2 = "lorem ipsum dolor sit amet";

    const hash1 = core.computeSimHash(text1);
    const hash2 = core.computeSimHash(text2);

    // Hamming distance should be larger for different texts
    const hammingDistance = bitCount(hash1 ^ hash2);
    expect(hammingDistance).toBeGreaterThan(15);
  });
});

/**
 * Count the number of set bits in a bigint
 */
function bitCount(x) {
  let count = 0;
  while (x > 0n) {
    if (x & 1n) count++;
    x >>= 1n;
  }
  return count;
}
