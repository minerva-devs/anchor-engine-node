#!/usr/bin/env node

/**
 * A/B Testing Script for Search Endpoints
 * Tests different search types and monitors memory usage
 */

import http from 'http';
import fs from 'fs';

const BASE_URL = 'http://localhost:3160';
const TEST_QUERIES = [
  { name: 'Standard Search', endpoint: '/v1/memory/search', query: 'Rob and coda' },
  { name: 'Molecule Search', endpoint: '/v1/memory/molecule-search', query: 'College Music education' },
  { name: 'Max-Recall Search', endpoint: '/v1/memory/search-max-recall', query: 'graph nodes consciousness' },
  { name: 'Distill', endpoint: '/v1/memory/distill', query: 'Rob' },
];

function getMemoryMB(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return match ? Math.round(parseInt(match[1]) / 1024) : 0;
  } catch (e) {
    return 0;
  }
}

function makeRequest(endpoint, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3160,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest(test, pid) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`Endpoint: ${test.endpoint}`);
  console.log(`Query: "${test.query}"`);
  console.log(`${'='.repeat(60)}`);

  const beforeMem = getMemoryMB(pid);
  console.log(`Memory Before: ${beforeMem} MB`);

  const startTime = Date.now();

  try {
    let result;
    if (test.endpoint === '/v1/memory/distill') {
      result = await makeRequest(test.endpoint, {
        seed: { query: test.query },
        output_format: 'json'
      });
    } else {
      result = await makeRequest(test.endpoint, {
        query: test.query,
        max_chars: 5000
      });
    }

    const duration = Date.now() - startTime;
    const afterMem = getMemoryMB(pid);
    const deltaMem = afterMem - beforeMem;

    console.log(`Status: ${result.status}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Memory After: ${afterMem} MB`);
    console.log(`Memory Delta: ${deltaMem > 0 ? '+' : ''}${deltaMem} MB`);

    if (result.data.results) {
      console.log(`Results: ${result.data.results.length} items`);
    }
    if (result.data.stats) {
      console.log(`Stats: ${JSON.stringify(result.data.stats)}`);
    }

    return { success: true, duration, beforeMem, afterMem, deltaMem };
  } catch (error) {
    const duration = Date.now() - startTime;
    const afterMem = getMemoryMB(pid);
    const deltaMem = afterMem - beforeMem;

    console.log(`ERROR: ${error.message}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Memory After: ${afterMem} MB`);
    console.log(`Memory Delta: ${deltaMem > 0 ? '+' : ''}${deltaMem} MB`);

    return { success: false, error: error.message, duration, beforeMem, afterMem, deltaMem };
  }
}

async function main() {
  const pid = process.argv[2] || process.pid;
  console.log(`Monitoring PID: ${pid}`);
  console.log(`Starting A/B Testing...\n`);

  const results = [];

  for (const test of TEST_QUERIES) {
    const result = await runTest(test, pid);
    results.push({ ...test, ...result });

    // Wait between tests to let memory settle
    console.log(`\nWaiting 3 seconds for memory to settle...`);
    await new Promise(r => setTimeout(r, 3000));
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(60)}`);

  let totalDelta = 0;
  for (const r of results) {
    totalDelta += r.deltaMem;
    const status = r.success ? '✓' : '✗';
    console.log(`${status} ${r.name.padEnd(20)} | ${r.duration.toString().padStart(5)}ms | ${r.deltaMem > 0 ? '+' : ''}${r.deltaMem.toString().padStart(4)}MB | ${r.afterMem}MB`);
  }

  console.log(`\nTotal Memory Delta: ${totalDelta > 0 ? '+' : ''}${totalDelta} MB`);
  console.log(`Final Memory: ${results[results.length - 1]?.afterMem || 0} MB`);
}

main().catch(console.error);