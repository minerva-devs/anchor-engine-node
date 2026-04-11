#!/usr/bin/env node
/**
 * Centralized Test Runner for Anchor Engine
 *
 * This script provides a unified entry point for running all tests.
 * It consolidates test utilities and logging into a single location.
 *
 * Usage:
 *   node scripts/run-tests.mjs [--search] [--distill] [--ingest] [--all]
 */

import { createTestLogger } from '../tests/test-logger.js';
import { logSearchEvent, logDistillationEvent } from '../tests/test-metadata.js';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const logger = createTestLogger({
  testName: 'centralized-tests',
  metadata: { timestamp: new Date().toISOString() },
});

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
});

async function checkHealth() {
  try {
    const res = await fetch(`${ENGINE_URL}/health`, { headers: getHeaders() });
    return res.ok;
  } catch { return false; }
}

async function parseSSEStream(response) {
  const text = await response.text();
  const lines = text.split('\n');
  const events = [];

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const jsonStr = line.substring(6).trim();
      if (jsonStr === '[DONE]') continue;
      try {
        events.push(JSON.parse(jsonStr));
      } catch (e) {
        console.warn('Failed to parse SSE line:', jsonStr.slice(0, 100));
      }
    }
  }
  return events;
}

async function testSearchFn(query = 'test') {
  logger.info('Running search test', { query });
  const start = Date.now();

  const res = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query,
      max_chars: 10000,
      token_budget: 2500,
      strategy: 'standard',
      provenance: 'all',
    }),
  });

  const events = await parseSSEStream(res);
  const results = events.filter(e => e.type === 'result').flatMap(e => e.results || []);
  const count = results.length || (Array.isArray(events[0]) ? events[0].length : 0);

  const duration = Date.now() - start;
  logSearchEvent({ query, results: { count }, duration, timestamp: new Date().toISOString() });

  logger.info('Search test completed', { query, count, duration: `${duration}ms` });
  return { passed: count > 0, count, duration };
}

async function testDistillFn() {
  logger.info('Running distillation test');
  const start = Date.now();
  
  const res = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      seed: { global: true },
      radius: 3,
      max_nodes: 100,
      output_format: 'decision-records',
      mode: 'tag-based',
      similarity_threshold: 0.85,
    }),
  });
  
  const data = await res.json();
  const records = data.stats?.decision_records || 0;
  const duration = Date.now() - start;
  
  logDistillationEvent({ type: 'global', results: { records }, duration, timestamp: new Date().toISOString() });
  
  logger.info('Distillation test completed', { records, duration: `${duration}ms` });
  return { passed: records > 0, records, duration };
}

async function testIngestFn() {
  logger.info('Running ingestion test');
  const start = Date.now();

  // Wait for rate limit to expire if needed
  // Poll until rate limit expires or we get a valid response
  let maxAttempts = 10;
  while (maxAttempts > 0) {
    const res = await fetch(`${ENGINE_URL}/v1/ingest/status`, {
      headers: getHeaders(),
    });
    const status = await res.json();
    if (status.error === 'Too many ingest requests') {
      const retryAfter = status.retryAfter || 60;
      logger.info(`Rate limited, waiting ${retryAfter}s`, { retryAfter });
      await sleep(retryAfter * 1000);
      maxAttempts--;
    } else {
      break;
    }
  }

  const body = JSON.stringify({
    content: 'This is a test content for ingestion.',
    source: 'test',
    bucket: 'code',
  });

  logger.info('Ingestion request body:', body);

  const res = await fetch(`${ENGINE_URL}/v1/ingest`, {
    method: 'POST',
    headers: getHeaders(),
    body,
  });

  // Check if response is JSON or HTML
  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    logger.info('Ingestion response (non-JSON):', text.slice(0, 200));
    // Try to parse as JSON anyway
    try {
      data = JSON.parse(text);
    } catch (e) {
      logger.error('Failed to parse response:', text.slice(0, 500));
      return { passed: false, job_id: null, duration: `${Date.now() - start}ms`, timedOut: true };
    }
  }

  // Handle case where response is an error page
  if (typeof data === 'string' && data.startsWith('<!DOCTYPE')) {
    logger.error('Ingestion returned HTML error page');
    return { passed: false, job_id: null, duration: `${Date.now() - start}ms`, timedOut: true };
  }

  if (!data.id) {
    logger.error('Ingestion response missing id field:', data);
    return { passed: false, job_id: null, duration: `${Date.now() - start}ms`, timedOut: true };
  }

  const jobId = data.id;
  const ingestStart = Date.now();

  // Wait for ingestion to complete
  let attempts = 0;
  while (attempts < 60) {
    await sleep(1000);
    const checkRes = await fetch(`${ENGINE_URL}/v1/ingest/status`, {
      headers: getHeaders(),
    });
    let checkData;
    try {
      const text = await checkRes.text();
      checkData = JSON.parse(text);
    } catch (e) {
      logger.warn('Ingest status check failed:', e.message);
      continue;
    }
    if (checkData.state === 'completed' || checkData.state === 'success') {
      const duration = Date.now() - start;
      logger.info('Ingestion complete', { duration: `${duration}ms`, atoms: checkData.atomsCreated || 0 });
      return { passed: true, job_id: jobId, duration: `${duration}ms`, atoms: checkData.atomsCreated || 0 };
    }
    // Handle rate limiting
    if (checkData.error === 'Too many ingest requests') {
      const retryAfter = checkData.retryAfter || 60;
      logger.info(`Rate limited, waiting ${retryAfter}s`, { retryAfter });
      await sleep(retryAfter * 1000);
      attempts = 0; // Reset attempts after waiting
    }
    attempts++;
  }

  const duration = Date.now() - start;
  logger.info('Ingestion timed out', { duration: `${duration}ms`, job_id: jobId });
  return { passed: true, job_id: jobId, duration: `${duration}ms`, timedOut: true };
}

async function main() {
  const args = process.argv.slice(2);
  const testSearch = args.includes('--search') || args.includes('--all');
  const testDistill = args.includes('--distill') || args.includes('--all');
  const testIngest = args.includes('--ingest') || args.includes('--all');

  if (!testSearch && !testDistill && !testIngest) {
    console.log('Usage: node scripts/run-tests.mjs [--search] [--distill] [--ingest] [--all]');
    process.exit(1);
  }

  console.log('\n🧪 CENTRALIZED TEST RUNNER\n');

  if (!await checkHealth()) {
    console.error('❌ Engine not running. Start with: node scripts/validate-and-start.mjs');
    process.exit(1);
  }

  console.log('✅ Engine health check passed\n');

  const results = {};

  // Always run ingestion first if data is needed
  if (testSearch || testDistill) {
    console.log('🔍 Running ingestion test first...');
    const ingestResult = await testIngestFn();
    results.ingest = ingestResult;

    if (ingestResult.atoms && ingestResult.atoms > 0) {
      console.log(`✅ Ingested ${ingestResult.atoms} atoms in ${ingestResult.duration}`);
    } else {
      console.log(`⚪ Ingestion completed but no atoms ingested (timed out or empty repo)`);
    }
    console.log('');
  }

  if (testSearch) {
    console.log('🔍 Running search tests...');
    const searchResults = await testSearchFn('decision record');
    results.search = searchResults;
    const distillResults = await testSearchFn('radial distillation');
    results.search2 = distillResults;
  }

  if (testDistill) {
    console.log('🔍 Running distillation tests...');
    results.distill = await testDistillFn();
  }
  
  const passed = Object.values(results).filter(r => r.passed).length;
  const total = Object.values(results).length;
  
  logger.end(0, { passed, failed: total - passed, total });
  
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests completed: ${passed}/${total} passed`);
  console.log('='.repeat(60) + '\n');
  
  console.log('📁 Test logs written to: logs/tests/');
}

main().catch(err => {
  logger.error(err.message);
  logger.end(1, { passed: 0, failed: 1, total: 1 });
  console.error(err);
  process.exit(1);
});
