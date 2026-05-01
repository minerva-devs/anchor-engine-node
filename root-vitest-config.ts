/**
 * Test Setup File for Vitest v4+
 *
 * Provides global setup, mocks, and configuration for the Anchor Engine test suite.
 */

import { beforeEach } from 'vitest';

// Global test environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.ANCHOR_ROOT = process.env.ANCHOR_ROOT || '/.anchor';
process.env.TS_NODE_TRANSPILE_ONLY = 'true';

// Configure test timeout for all tests using vitest's beforeEach hook
beforeEach(() => {
  // Set default timeout for all tests in this suite
  vi.useFakeTimers();
});

// Log test environment setup
console.log('[Test Setup] Environment configured:', {
  NODE_ENV: process.env.NODE_ENV,
  ANCHOR_ROOT: process.env.ANCHOR_ROOT,
});

export {};
