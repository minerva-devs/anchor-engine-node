#!/usr/bin/env node
/**
 * Auto-start test runner
 *
 * This script:
 * 1. Starts the engine in background
 * 2. Waits for it to be ready
 * 3. Runs the tests
 * 4. Exits with appropriate code
 *
 * Usage: node scripts/auto-test.mjs
 */

import { spawn } from 'child_process';
import { createTestLogger } from '../tests/test-logger.js';

const logger = createTestLogger({
  testName: 'auto-test',
  metadata: { timestamp: new Date().toISOString() },
});

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForEngine(maxAttempts = 40, delay = 1500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${ENGINE_URL}/health`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      });
      if (res.ok) {
        console.log('✅ Engine is ready');
        return true;
      }
    } catch {}
    console.log(`⏱️  Waiting for engine... (${i + 1}/${maxAttempts})`);
    await sleep(delay);
  }
  return false;
}

async function runTest(command) {
  return new Promise((resolve) => {
    const proc = spawn(command, [], {
      shell: true,
      stdio: 'pipe',
    });

    proc.stdout.on('data', (data) => {
      process.stdout.write(data.toString());
    });

    proc.stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('\n🚀 Auto-Start Test Runner\n');

  // Start engine in background
  console.log('🔍 Starting engine...');
  const engineProc = spawn('node', ['scripts/validate-and-start.mjs'], {
    shell: true,
    detached: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  engineProc.stdout.on('data', (data) => {
    const text = data.toString();
    if (text.includes('Startup complete')) {
      console.log('✅ Engine startup complete');
    }
    // Keep engine alive by consuming output
  });

  engineProc.stderr.on('data', (data) => {
    // Suppress stderr
  });

  engineProc.on('close', (code) => {
    console.log(`Engine process closed with code ${code}`);
  });

  // Wait for engine
  const ready = await waitForEngine();

  if (!ready) {
    console.error('❌ Engine failed to start');
    logger.end(1, { passed: 0, failed: 1, total: 1 });
    process.exit(1);
  }

  // Run tests
  console.log('\n🧪 Running tests...\n');
  const passed = await runTest('node scripts/run-tests.mjs --all');

  logger.end(passed ? 0 : 1, {
    passed,
    failed: !passed,
    total: 1,
  });

  console.log(`\n✅ Test run completed with exit code: ${passed ? 0 : 1}`);

  // Keep engine alive briefly
  console.log('Keeping engine alive for 10 seconds...');
  await sleep(10000);
  console.log('Exiting...');
  process.exit(passed ? 0 : 1);
}

main().catch(err => {
  logger.error(err.message);
  logger.end(1, { passed: 0, failed: 1, total: 1 });
  console.error(err);
  process.exit(1);
});
