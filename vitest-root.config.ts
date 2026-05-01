/**
 * Test Setup File for Vitest v4+ - Root level
 */

import { beforeEach } from 'vitest';
const vi = await import('vitest'); // Load vitest in a way that avoids /@id/ path issues

// Global test environment variables (will be set in engine tests)
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

beforeEach(() => {
  vi.useFakeTimers();
});

export {}; // Mark as ES module export
