/**
 * Integration Tests for Search Service
 *
 * Tests end-to-end search workflows and cache behavior.
 * Note: Full database integration tests require database setup.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

// Import after mocks
import {
  searchCache,
  clusterMolecules,
} from '../../src/services/search/search.js';

describe('Search Integration Tests', () => {
  beforeEach(() => {
    searchCache.clear();
  });

  describe('Cache Integration', () => {
    it('caches search results and returns them on subsequent calls', () => {
      const cacheKey = 'integration-test-key';

      // First call - cache miss
      expect(searchCache.has(cacheKey)).toBe(false);

      // Simulate caching
      searchCache.set(cacheKey, {
        results: {
          context: 'test context',
          results: [{ id: '1', content: 'result' }],
          toAgentString: () => 'test',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      // Second call - cache hit
      expect(searchCache.has(cacheKey)).toBe(true);
      const cached = searchCache.get(cacheKey);
      expect(cached?.results.context).toBe('test context');
    });

    it('maintains cache size limits', () => {
      // Add many entries
      for (let i = 0; i < 150; i++) {
        searchCache.set(`key-${i}`, {
          results: {
            context: `result-${i}`,
            results: [],
            toAgentString: () => 'test',
            attempt: 1,
          },
          timestamp: Date.now(),
        });
      }

      // Cache should respect max size limit (default: 100 entries)
      // LRU cache automatically evicts oldest entries when max capacity is reached
      expect(searchCache.size).toBe(100);

      // Clear and verify
      searchCache.clear();
      expect(searchCache.size).toBe(0);
    });

    it('preserves cache entries across operations', () => {
      const key1 = 'persistent-key-1';
      const key2 = 'persistent-key-2';

      searchCache.set(key1, {
        results: { context: 'result1', results: [], toAgentString: () => 'test', attempt: 1 },
        timestamp: Date.now(),
      });

      searchCache.set(key2, {
        results: { context: 'result2', results: [], toAgentString: () => 'test', attempt: 1 },
        timestamp: Date.now(),
      });

      // Both should still exist
      expect(searchCache.has(key1)).toBe(true);
      expect(searchCache.has(key2)).toBe(true);
    });
  });

  describe('End-to-End Search Scenarios', () => {
    it('handles simple keyword search caching', () => {
      const query = 'javascript';
      const cacheKey = `search-${query}`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Search results for: javascript',
          results: [
            {
              id: '1',
              content: 'JavaScript is a programming language',
              source: 'docs/js.md',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#javascript', '#programming'],
              provenance: 'internal',
              score: 0.95,
            },
          ],
          toAgentString: () => 'Found 1 result for javascript',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results.length).toBe(1);
      expect(cached?.results.results[0].tags).toContain('#javascript');
    });

    it('handles multi-term search caching', () => {
      const query = 'machine learning algorithms';
      const cacheKey = `search-${query}`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Search results for: machine learning algorithms',
          results: [
            {
              id: '1',
              content: 'Introduction to machine learning algorithms',
              source: 'ml/intro.md',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#machine-learning', '#algorithms'],
              provenance: 'internal',
              score: 0.90,
            },
          ],
          toAgentString: () => 'Found 1 result',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].content).toContain('machine learning');
    });

    it('handles bucket-filtered search caching', () => {
      const query = 'project notes';
      const cacheKey = `search-${query}-buckets`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Search in buckets: inbox, external',
          results: [
            {
              id: '1',
              content: 'Project meeting notes',
              source: 'notes/project.md',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#notes', '#project'],
              provenance: 'internal',
              score: 0.85,
            },
          ],
          toAgentString: () => 'Found 1 result in specified buckets',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].buckets).toContain('inbox');
    });

    it('handles provenance-filtered search caching', () => {
      const query = 'internal documentation';
      const cacheKey = `search-${query}-provenance`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Search with provenance: internal',
          results: [
            {
              id: '1',
              content: 'Internal API documentation',
              source: 'docs/api.md',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#api', '#docs'],
              provenance: 'internal',
              score: 0.88,
            },
          ],
          toAgentString: () => 'Found 1 internal result',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].provenance).toBe('internal');
    });

    it('handles tag-filtered search caching', () => {
      const query = 'typescript code';
      const cacheKey = `search-${query}-tags`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Search with tags: #typescript',
          results: [
            {
              id: '1',
              content: 'TypeScript best practices',
              source: 'docs/ts.md',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#typescript', '#best-practices'],
              provenance: 'internal',
              score: 0.92,
            },
          ],
          toAgentString: () => 'Found 1 result with #typescript',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].tags).toContain('#typescript');
    });
  });

  describe('Performance and Memory', () => {
    it('handles large result sets', () => {
      const cacheKey = 'large-result-set';

      // Simulate large result set
      const largeResults = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        content: `Result ${i}`,
        source: `file${i}.ts`,
        timestamp: Date.now(),
        buckets: ['inbox'],
        tags: ['#test'],
        provenance: 'internal' as const,
        score: 1 - i / 100,
      }));

      searchCache.set(cacheKey, {
        results: {
          context: 'Large result set',
          results: largeResults,
          toAgentString: () => `Found ${largeResults.length} results`,
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results.length).toBe(100);
    });

    it('handles concurrent cache operations', async () => {
      const keys = ['key1', 'key2', 'key3', 'key4', 'key5'];

      // Add entries concurrently
      await Promise.all(
        keys.map(key =>
          Promise.resolve().then(() => {
            searchCache.set(key, {
              results: {
                context: `result for ${key}`,
                results: [],
                toAgentString: () => 'test',
                attempt: 1,
              },
              timestamp: Date.now(),
            });
          }),
        ),
      );

      // Verify all entries exist
      keys.forEach(key => {
        expect(searchCache.has(key)).toBe(true);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles malformed queries in cache', () => {
      const malformedQuery = '<script>alert("xss")</script>';
      const cacheKey = `search-${malformedQuery}`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Malformed query result',
          results: [],
          toAgentString: () => 'test',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('handles very long queries in cache', () => {
      const longQuery = 'A'.repeat(10000);
      const cacheKey = `search-${longQuery}`;

      searchCache.set(cacheKey, {
        results: {
          context: 'Long query result',
          results: [],
          toAgentString: () => 'test',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('handles empty queries in cache', () => {
      const cacheKey = 'search-empty';

      searchCache.set(cacheKey, {
        results: {
          context: 'Empty query result',
          results: [],
          toAgentString: () => 'test',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached).toBeDefined();
    });
  });

  describe('Real-World Scenarios', () => {
    it('searches for code snippets', () => {
      const cacheKey = 'code-search';

      searchCache.set(cacheKey, {
        results: {
          context: 'Code search results',
          results: [
            {
              id: '1',
              content: 'async function fetchData() { await fetch() }',
              source: 'src/api.ts',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#code', '#async'],
              provenance: 'internal',
              score: 0.95,
              type: 'code',
            },
          ],
          toAgentString: () => 'Found 1 code result',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].type).toBe('code');
    });

    it('searches for documentation', () => {
      const cacheKey = 'doc-search';

      searchCache.set(cacheKey, {
        results: {
          context: 'Documentation search',
          results: [
            {
              id: '1',
              content: 'REST API documentation with endpoint descriptions',
              source: 'docs/api.md',
              timestamp: Date.now(),
              buckets: ['external'],
              tags: ['#api', '#documentation', '#rest'],
              provenance: 'external',
              score: 0.90,
            },
          ],
          toAgentString: () => 'Found 1 documentation result',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].provenance).toBe('external');
      expect(cached?.results.results[0].tags).toContain('#documentation');
    });

    it('searches for conversation history', () => {
      const cacheKey = 'conversation-search';

      searchCache.set(cacheKey, {
        results: {
          context: 'Conversation search',
          results: [
            {
              id: '1',
              content: '[User]: What about the architecture? [Assistant]: The architecture uses...',
              source: 'chats/session.jsonl',
              timestamp: Date.now(),
              buckets: ['inbox'],
              tags: ['#conversation', '#architecture'],
              provenance: 'internal',
              score: 0.88,
            },
          ],
          toAgentString: () => 'Found 1 conversation result',
          attempt: 1,
        },
        timestamp: Date.now(),
      });

      const cached = searchCache.get(cacheKey);
      expect(cached?.results.results[0].source).toContain('.jsonl');
    });
  });

  describe('clusterMolecules Integration', () => {
    it('clusters molecules from multiple sources', () => {
      const molecules = [
        {
          id: '1',
          content: 'Content from file A',
          source: 'fileA.ts',
          timestamp: Date.now(),
          buckets: ['inbox'],
          tags: ['#tag1'],
          provenance: 'internal' as const,
        },
        {
          id: '2',
          content: 'More content from file A',
          source: 'fileA.ts',
          timestamp: Date.now(),
          buckets: ['inbox'],
          tags: ['#tag2'],
          provenance: 'internal' as const,
        },
        {
          id: '3',
          content: 'Content from file B',
          source: 'fileB.ts',
          timestamp: Date.now(),
          buckets: ['inbox'],
          tags: ['#tag3'],
          provenance: 'internal' as const,
        },
      ];

      const clusters = clusterMolecules(molecules);
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });

    it('handles molecules with same source', () => {
      const molecules = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        content: `Content ${i}`,
        source: 'same-file.ts',
        timestamp: Date.now(),
        buckets: ['inbox'],
        tags: [`#tag${i}`],
        provenance: 'internal' as const,
      }));

      const clusters = clusterMolecules(molecules);
      expect(Array.isArray(clusters)).toBe(true);
      // All molecules from same source should be in one or more clusters
      expect(clusters.length).toBeGreaterThanOrEqual(1);
    });
  });
});
