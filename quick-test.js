#!/usr/bin/env node

import http from 'http';
import fs from 'fs';

const BASE_URL = 'http://localhost:3160';

function getMemoryMB(pid) {
  try {
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const match = status.match(/VmRSS:\s+(\d+)\s+kB/);
    return match ? Math.round(parseInt(match[1]) / 1024) : 0;
  } catch (e) {
    return 0;
  }
}

function makeRequest(endpoint, data, timeoutMs = 30000) {
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
      },
      timeout: timeoutMs
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
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(postData);
    req.end();
  });
}

async function quickTest(pid) {
  console.log(`\nQuick Test - PID: ${pid}`);
  console.log(`Memory: ${getMemoryMB(pid)} MB\n`);

  const tests = [
    { name: 'Stats', endpoint: '/v1/stats', method: 'GET' },
    { name: 'Health', endpoint: '/health', method: 'GET' },
  ];

  for (const test of tests) {
    try {
      const beforeMem = getMemoryMB(pid);
      const startTime = Date.now();

      let result;
      if (test.method === 'GET') {
        result = await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:3160${test.endpoint}`, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
              try {
                resolve({ status: res.statusCode, data: JSON.parse(body) });
              } catch (e) {
                resolve({ status: res.statusCode, data: body });
              }
            });
          });
          req.on('error', reject);
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
      }

      const duration = Date.now() - startTime;
      const afterMem = getMemoryMB(pid);

      console.log(`✓ ${test.name}: ${duration}ms, ${afterMem} MB (${afterMem - beforeMem > 0 ? '+' : ''}${afterMem - beforeMem}MB)`);
    } catch (error) {
      console.log(`✗ ${test.name}: ${error.message}`);
    }
  }

  // Try one search with short timeout
  console.log(`\nTrying search (15s timeout)...`);
  try {
    const beforeMem = getMemoryMB(pid);
    const startTime = Date.now();

    const result = await makeRequest('/v1/memory/search', {
      query: 'test',
      max_chars: 5000
    }, 15000);

    const duration = Date.now() - startTime;
    const afterMem = getMemoryMB(pid);

    console.log(`✓ Search: ${duration}ms, Status: ${result.status}, ${afterMem} MB (${afterMem - beforeMem > 0 ? '+' : ''}${afterMem - beforeMem}MB)`);
    if (result.data.results) {
      console.log(`  Results: ${result.data.results.length} items`);
    }
  } catch (error) {
    console.log(`✗ Search: ${error.message}`);
  }

  console.log(`\nFinal Memory: ${getMemoryMB(pid)} MB`);
}

const pid = process.argv[2] || process.pid;
quickTest(pid).catch(console.error);