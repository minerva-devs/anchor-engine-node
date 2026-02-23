/**
 * Mock Data and Utilities for Search Component Tests
 * 
 * Provides realistic mock data for testing search result formatting,
 * content rendering, and API responses.
 */

import { SearchResult } from '../../types/api';

/**
 * Mock search result with realistic content
 */
export function createMockSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'atom_test123',
    content: 'This is a test search result with some sample content for testing purposes.',
    source: 'inbox/test-document.md',
    timestamp: Date.now() - 3600000, // 1 hour ago
    buckets: ['core'],
    tags: ['test', 'sample'],
    epochs: '',
    provenance: 'internal',
    score: 0.85,
    molecular_signature: 'abc123',
    frequency: 1,
    type: 'thought',
    compound_id: 'mem_test',
    start_byte: 0,
    end_byte: 100,
    is_inflated: false,
    temporal_state: {
      first_seen: Date.now() - 3600000,
      last_seen: Date.now(),
      occurrence_count: 1,
      timestamps: [Date.now() - 3600000]
    },
    ...overrides
  };
}

/**
 * Mock search API response
 */
export interface MockSearchResponse {
  results: SearchResult[];
  context: string;
  metadata: {
    atomCount: number;
    filledPercent: number;
    budget: number;
    tokens_used: number;
  };
  split_queries?: string[];
}

export function createMockSearchResponse(overrides: Partial<MockSearchResponse> = {}): MockSearchResponse {
  return {
    results: [
      createMockSearchResult({
        id: 'atom_1',
        content: 'First search result with important information about the query topic.',
        score: 0.95,
        provenance: 'internal',
        source: 'inbox/document-1.md'
      }),
      createMockSearchResult({
        id: 'atom_2',
        content: 'Second result providing additional context and details.',
        score: 0.87,
        provenance: 'external',
        source: 'external-inbox/research-article.html'
      }),
      createMockSearchResult({
        id: 'atom_3',
        content: 'Third result with code example:\n\n```typescript\nconst x = 42;\n```\n\nAnd explanation.',
        score: 0.72,
        provenance: 'internal',
        source: 'inbox/Code/example.ts'
      })
    ],
    context: '- [2026-02-22T10:00:00.000Z] First search result with important information...\n- [2026-02-22T09:00:00.000Z] Second result providing additional context...',
    metadata: {
      atomCount: 3,
      filledPercent: 45,
      budget: 8192,
      tokens_used: 3686
    },
    ...overrides
  };
}

/**
 * Creates mock results with duplicate content for testing deduplication
 */
export function createDuplicateResults(): SearchResult[] {
  const baseContent = 'This is duplicate content that appears in multiple files for testing deduplication.';
  
  return [
    createMockSearchResult({
      id: 'atom_dup1',
      content: baseContent,
      source: 'inbox/file1.md',
      score: 0.9,
      compound_id: 'mem_1',
      start_byte: 0,
      end_byte: 100
    }),
    createMockSearchResult({
      id: 'atom_dup2',
      content: baseContent, // Identical content
      source: 'inbox/file2.md', // Different file
      score: 0.85,
      compound_id: 'mem_2',
      start_byte: 0,
      end_byte: 100
    }),
    createMockSearchResult({
      id: 'atom_dup3',
      content: baseContent + ' Extra sentence.', // Nearly identical
      source: 'inbox/file3.md',
      score: 0.8,
      compound_id: 'mem_3',
      start_byte: 0,
      end_byte: 120
    })
  ];
}

/**
 * Creates mock results with various content types
 */
export function createMixedContentResults(): SearchResult[] {
  return [
    createMockSearchResult({
      id: 'atom_code',
      content: '```typescript\nfunction test() {\n  return "hello";\n}\n```',
      type: 'code',
      score: 0.9
    }),
    createMockSearchResult({
      id: 'atom_prose',
      content: 'This is a narrative paragraph with multiple sentences. It continues with more details. And ends here.',
      type: 'prose',
      score: 0.85
    }),
    createMockSearchResult({
      id: 'atom_json',
      content: '{"key": "value", "number": 42, "nested": {"a": 1}}',
      type: 'data',
      score: 0.7
    }),
    createMockSearchResult({
      id: 'atom_log',
      content: '[2026-02-22T10:00:00.000Z] INFO: Application started\n[2026-02-22T10:00:01.000Z] DEBUG: Loading config...',
      type: 'log',
      score: 0.65
    })
  ];
}

/**
 * Creates mock results with edge cases
 */
export function createEdgeCaseResults(): SearchResult[] {
  return [
    createMockSearchResult({
      id: 'atom_empty',
      content: '',
      score: 0.5
    }),
    createMockSearchResult({
      id: 'atom_long',
      content: 'A'.repeat(10000), // Very long content
      score: 0.8
    }),
    createMockSearchResult({
      id: 'atom_special',
      content: 'Special chars: <>&"\' \n\t\r\n Unicode: 你好世界 🚀',
      score: 0.75
    }),
    createMockSearchResult({
      id: 'atom_no_source',
      content: 'Content without source path',
      source: '',
      score: 0.6
    }),
    createMockSearchResult({
      id: 'atom_old',
      content: 'Old content from last year',
      timestamp: Date.now() - (365 * 24 * 60 * 60 * 1000), // 1 year ago
      score: 0.4
    })
  ];
}

/**
 * Creates mock results with broken relevance scores for testing
 */
export function createBrokenScoreResults(): SearchResult[] {
  return [
    createMockSearchResult({
      id: 'atom_score_100',
      content: 'Result with 164065% score (broken)',
      score: 1640.65, // Should be normalized to 0.0-1.0
    }),
    createMockSearchResult({
      id: 'atom_score_normal',
      content: 'Result with normal score',
      score: 0.85,
    }),
    createMockSearchResult({
      id: 'atom_score_zero',
      content: 'Result with zero score',
      score: 0,
    }),
    createMockSearchResult({
      id: 'atom_score_negative',
      content: 'Result with negative score (bug)',
      score: -0.5,
    })
  ];
}

/**
 * Mock API service for testing
 */
export const mockApi = {
  search: vi.fn<(params: any) => Promise<MockSearchResponse>>(),
  getBuckets: vi.fn<() => Promise<string[]>>(),
  getTags: vi.fn<(buckets?: string[]) => Promise<string[]>>(),
};

/**
 * Reset all mocks
 */
export function resetMocks() {
  mockApi.search.mockReset();
  mockApi.getBuckets.mockReset();
  mockApi.getTags.mockReset();
}

/**
 * Setup default mock responses
 */
export function setupDefaultMocks() {
  mockApi.search.mockResolvedValue(createMockSearchResponse());
  mockApi.getBuckets.mockResolvedValue(['core', 'inbox', 'external-inbox']);
  mockApi.getTags.mockResolvedValue(['test', 'sample', 'important']);
}
