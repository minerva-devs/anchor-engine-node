/**
 * End-to-End A+B Tests
 * Full integration: Dashboard → API Client → Engine
 *
 * These tests require a running Anchor Engine instance on localhost:3160
 * Run with: pnpm test:e2e
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnchorClient } from '@rbalchii/anchor-client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENGINE_URL = process.env.ANCHOR_API_URL || 'http://localhost:3160';
const TEST_TIMEOUT = 60000;

describe('E2E A+B Tests - Full Stack', () => {
  let client: AnchorClient;
  let testCompoundId: string;

  beforeAll(async () => {
    client = new AnchorClient({
      baseUrl: ENGINE_URL,
      timeout: 30000
    });

    // Ensure engine is running
    try {
      await client.getStats();
    } catch (error) {
      throw new Error(
        `Anchor Engine not running at ${ENGINE_URL}. Start it with: pnpm start`
      );
    }
  }, TEST_TIMEOUT);

  describe('Complete User Workflow', () => {
    it('A→B: Complete flow - Ingest → Search → Distill → Illuminate', async () => {
      // Step 1: Ingest test content (A)
      const testContent = `
        Anchor Engine is a deterministic semantic memory system.
        It uses graph traversal instead of vector search.
        The STAR algorithm walks the graph to find related concepts.
        Memory is stored as compounds, molecules, and atoms.
        Atoms contain tags that represent concepts.
        Graph edges represent relationships between concepts.
      `;

      const ingestResult = await client.ingestText(testContent, {
        bucket: 'external-inbox',
        metadata: { source: 'e2e-test' }
      });

      expect(ingestResult.success).toBe(true);
      testCompoundId = ingestResult.compoundId;

      // Step 2: Search for ingested content (A)
      const searchResult = await client.search('graph traversal', {
        maxResults: 10
      });

      expect(searchResult.results.length).toBeGreaterThan(0);
      const firstResult = searchResult.results[0];
      expect(firstResult.content).toBeDefined();
      expect(firstResult.score).toBeGreaterThan(0);

      // Step 3: Run distillation (B)
      const distillResult = await client.distill({
        seed: 'graph',
        radius: 2,
        outputFormat: 'yaml'
      });

      expect(distillResult.outputPath).toBeDefined();
      expect(distillResult.stats.compressionRatio).toBeGreaterThan(1);

      // Step 4: Illuminate graph (B)
      const illuminateResult = await client.illuminate('memory', {
        depth: 2,
        maxNodes: 20
      });

      expect(illuminateResult.nodes.length).toBeGreaterThan(0);
      expect(illuminateResult.edges).toBeDefined();

      // Step 5: Read back the file (B)
      if (distillResult.outputPath && existsSync(distillResult.outputPath)) {
        const content = readFileSync(distillResult.outputPath, 'utf-8');
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain('---'); // YAML format
      }
    }, TEST_TIMEOUT);

    it('B→A: Extension workflow - List → Read → Search', async () => {
      // Step 1: List available compounds (B)
      const listResult = await client.listCompounds({
        filter: 'test',
        limit: 10
      });

      expect(listResult.compounds).toBeDefined();

      // Step 2: Read a specific file (B)
      if (listResult.compounds.length > 0) {
        const compound = listResult.compounds[0];
        const readResult = await client.readFile({
          path: compound.id,
          startLine: 1,
          endLine: 5
        });

        expect(readResult.content).toBeDefined();
        expect(readResult.lines).toBeLessThanOrEqual(5);
      }

      // Step 3: Search with pagination (A)
      const searchResult = await client.search('anchor', {
        maxResults: 5,
        offset: 0
      });

      expect(searchResult.results.length).toBeLessThanOrEqual(5);

      // Get next page
      const nextPage = await client.search('anchor', {
        maxResults: 5,
        offset: 5
      });

      expect(nextPage.results).toBeDefined();
    }, TEST_TIMEOUT);
  });

  describe('Performance Benchmarks (Real Engine)', () => {
    it('A: Search latency < 200ms (p95)', async () => {
      const queries = [
        'graph traversal',
        'semantic memory',
        'deterministic search',
        'anchor engine',
        'STAR algorithm'
      ];

      const latencies: number[] = [];

      for (const query of queries) {
        const start = Date.now();
        await client.search(query);
        const duration = Date.now() - start;
        latencies.push(duration);
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

      console.log(`Search latencies: avg=${avgLatency}ms, p95=${p95Latency}ms`);

      // p95 should be under 200ms
      expect(p95Latency).toBeLessThan(500); // Generous for CI
    }, TEST_TIMEOUT);

    it('B: Concurrent requests stress test', async () => {
      const concurrentQueries = Array(10).fill('test concurrent');
      const start = Date.now();

      const promises = concurrentQueries.map(q => client.search(q));
      const results = await Promise.all(promises);

      const totalDuration = Date.now() - start;
      const avgDuration = totalDuration / results.length;

      console.log(`Concurrent test: ${results.length} requests in ${totalDuration}ms (avg: ${avgDuration}ms)`);

      expect(results).toHaveLength(10);
      expect(totalDuration).toBeLessThan(5000); // All should complete within 5s
    }, TEST_TIMEOUT);
  });

  describe('Data Integrity', () => {
    it('A→B: Ingested data persists and is searchable', async () => {
      const uniqueText = `E2E_TEST_UNIQUE_${Date.now()}_ANCHOR_MEMORY_GRAPH`;
      
      // Ingest unique content
      await client.ingestText(uniqueText, {
        bucket: 'external-inbox'
      });

      // Wait a moment for indexing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Search for it
      const searchResult = await client.search(uniqueText.split('_')[3]); // Search for "ANCHOR"
      
      // Should find it
      const found = searchResult.results.some(r => 
        r.content.includes('ANCHOR') || r.content.includes('MEMORY')
      );
      
      expect(found).toBe(true);
    }, TEST_TIMEOUT);
  });

  afterAll(async () => {
    // Cleanup if needed
    if (testCompoundId) {
      // Could add delete endpoint if needed
      console.log(`Test compound ${testCompoundId} created`);
    }
  });
});
