import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock the anchor-client
vi.mock('@rbalchii/anchor-client', () => ({
  AnchorClient: vi.fn().mockImplementation(() => ({
    search: vi.fn().mockResolvedValue({
      query: 'test',
      results: [],
      stats: { atoms: 100, molecules: 50 }
    }),
    ingestText: vi.fn().mockResolvedValue({
      success: true,
      compoundId: 'test-compound-123'
    }),
    distill: vi.fn().mockResolvedValue({
      outputPath: '/test/output.yaml',
      stats: {
        linesTotal: 1000,
        linesUnique: 500,
        compressionRatio: 2.0,
        durationMs: 5000
      }
    }),
    illuminate: vi.fn().mockResolvedValue({
      nodes: [],
      edges: []
    }),
    readFile: vi.fn().mockResolvedValue({
      content: 'test content',
      lines: 10
    }),
    listCompounds: vi.fn().mockResolvedValue({
      compounds: [],
      total: 0
    }),
    getStats: vi.fn().mockResolvedValue({
      atoms: 1000,
      molecules: 500,
      compounds: 50
    })
  }))
}));
