#!/usr/bin/env node

/**
 * Stress Test: Multiple search iterations to check for memory leaks
 */

import http from 'http';
import fs from 'fs';

const BASE_URL = 'http://localhost:3160';
const ITERATIONS = 10;
const TEST_QUERIES = [
  { name: 'Standard Search', endpoint: '/v1/memory/search', query: 'Rob and coda' },
  { name: 'Molecule Search', endpoint: '/v1/memory/molecule-search', query: 'College Music education' },
  { name: 'Max-Recall Search', endpoint: '/v1/memory/search-max-recall', query: 'graph nodes consciousness' },
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

async function runStressTest(pid) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`STRESS TEST: ${ITERATIONS} iterations of all search types`);
  console.log(`Monitoring PID: ${pid}`);
  console.log(`${'='.repeat(60)}\n`);

  const startMem = getMemoryMB(pid);
  console.log(`Starting Memory: ${startMem} MB\n`);

  const results = [];

  for (let i = 0; i < ITERATIONS; i++) {
    console.log(`\n--- Iteration ${i + 1}/${ITERATIONS} ---`);

    for (const test of TEST_QUERIES) {
      const beforeMem = getMemoryMB(pid);
      const startTime = Date.now();

      try {
        const result = await makeRequest(test.endpoint, {
          query: test.query,
          max_chars: 5000
        });

        const duration = Date.now() - startTime;
        const afterMem = getMemoryMB(pid);
        const deltaMem = afterMem - beforeMem;

        console.log(`  ${test.name}: ${duration}ms, ${deltaMem > 0 ? '+' : ''}${deltaMem}MB (${afterMem}MB)`);
      } catch (error) {
        console.log(`  ${test.name}: ERROR - ${error.message}`);
      }
    }

    // Small delay between iterations
    await new Promise(r => setTimeout(r, 500));
  }

  const endMem = getMemoryMB(pid);
  const totalDelta = endMem - startMem;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`STRESS TEST RESULTS`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Starting Memory: ${startMem} MB`);
  console.log(`Ending Memory:   ${endMem} MB`);
  console.log(`Total Delta:     ${totalDelta > 0 ? '+' : ''}${totalDelta} MB`);
  console.log(`Per Iteration:   ${(totalDelta / ITERATIONS).toFixed(2)} MB avg`);

  if (totalDelta > 100) {
    console.log(`\n⚠️  WARNING: Significant memory growth detected!`);
  } else if (totalDelta > 50) {
    console.log(`\n⚠️  CAUTION: Moderate memory growth detected.`);
  } else {
    console.log(`\n✅ PASS: Memory usage is stable.`);
  }
}

const pid = process.argv[2] || process.pid;
runStressTest(pid).catch(console.error);