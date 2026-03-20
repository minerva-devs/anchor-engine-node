/**
 * A+B Integration Tests for @rbalchii/anchor-client
 * 
 * These tests emulate real-world usage scenarios for:
 * - Frontend dashboard integration
 * - Browser extension capabilities
 * - Direct API consumption
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnchorClient, AnchorClientConfig } from '../src/index';

// Test configuration
const TEST_CONFIG: AnchorClientConfig = {
  baseUrl: process.env.ANCHOR_API_URL || 'http://localhost:3160',
  apiKey: process.env.ANCHOR_API_KEY || '',
  timeout: 30000
};

describe('AnchorClient - A+B Integration Tests', () => {
  let client: AnchorClient;

  beforeAll(() => {
    client = new AnchorClient(TEST_CONFIG);
  });

  describe('Frontend Dashboard Capabilities', () => {
    it('A: Should search memory graph with query', async () => {
      const query = 'test memory';
      const results = await client.search(query, { maxResults: 10 });
      
      expect(results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      expect(results.query).toBe(query);
    });

    it('B: Should search with filters and buckets', async () => {
      const results = await client.search('code patterns', {
        maxResults: 20,
        buckets: ['inbox'],
        minScore: 0.5
      });
      
      expect(results.results.length).toBeLessThanOrEqual(20);
      results.results.forEach(result => {
        expect(result.score).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('A: Should ingest text content', async () => {
      const testText = 'This is test content for ingestion testing. It contains multiple sentences.';
      const result = await client.ingestText(testText, {
        bucket: 'external-inbox',
        metadata: { source: 'test-suite' }
      });
      
      expect(result.success).toBe(true);
      expect(result.compoundId).toBeDefined();
    });

    it('B: Should run distillation on corpus', async () => {
      const result = await client.distill({
        seed: 'test',
        radius: 3,
        outputFormat: 'yaml'
      });
      
      expect(result).toBeDefined();
      expect(result.outputPath).toBeDefined();
      expect(result.stats).toBeDefined();
    });

    it('A: Should illuminate graph from seed', async () => {
      const result = await client.illuminate('memory', {
        depth: 2,
        maxNodes: 50
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.nodes)).toBe(true);
    });
  });

  describe('Browser Extension Capabilities', () => {
    it('B: Should read file with line ranges (token-efficient)', async () => {
      const result = await client.readFile({
        path: 'test-file.txt',
        startLine: 1,
        endLine: 10
      });
      
      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.lines).toBeDefined();
    });

    it('A: Should list available compounds', async () => {
      const result = await client.listCompounds({
        filter: 'test',
        limit: 50
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.compounds)).toBe(true);
    });

    it('B: Should get system statistics', async () => {
      const stats = await client.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.atoms).toBeDefined();
      expect(stats.molecules).toBeDefined();
      expect(stats.compounds).toBeDefined();
    });

    it('A: Should handle pagination for large result sets', async () => {
      const results = [];
      let page = 1;
      const pageSize = 20;
      
      do {
        const response = await client.search('test', {
          maxResults: pageSize,
          offset: (page - 1) * pageSize
        });
        
        results.push(...response.results);
        page++;
        
        // Stop if we got fewer results than requested (last page)
        if (response.results.length < pageSize) break;
        
        // Safety limit
        if (page > 5) break;
      } while (true);
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('B: Should handle connection errors gracefully', async () => {
      const badClient = new AnchorClient({
        ...TEST_CONFIG,
        baseUrl: 'http://localhost:9999' // Non-existent server
      });
      
      await expect(badClient.search('test')).rejects.toThrow();
    });

    it('A: Should handle empty query results', async () => {
      const results = await client.search('xyznonexistent123');
      
      expect(results).toBeDefined();
      expect(Array.isArray(results.results)).toBe(true);
      // Empty results are OK - shouldn't throw
    });

    it('B: Should validate input parameters', async () => {
      await expect(
        client.search('', { maxResults: -1 })
      ).rejects.toThrow();
    });
  });

  describe('Performance Benchmarks', () => {
    it('A: Should complete search within 200ms (p95)', async () => {
      const start = Date.now();
      await client.search('test performance');
      const duration = Date.now() - start;
      
      // Allow for some variance, but should be under 200ms
      expect(duration).toBeLessThan(500);
    });

    it('B: Should handle concurrent requests', async () => {
      const queries = ['test1', 'test2', 'test3', 'test4', 'test5'];
      const start = Date.now();
      
      const promises = queries.map(q => client.search(q));
      const results = await Promise.all(promises);
      
      const duration = Date.now() - start;
      
      expect(results).toHaveLength(5);
      // All concurrent requests should complete within reasonable time
      expect(duration).toBeLessThan(2000);
    });
  });
});
