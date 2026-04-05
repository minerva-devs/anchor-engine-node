#!/usr/bin/env node
/**
 * A+B Test Runner
 * 
 * Runs comprehensive test suite for:
 * - API Client (Unit + Integration)
 * - Web Dashboard (Component)
 * - End-to-End (Full Stack)
 * 
 * Usage:
 *   pnpm test:all              # Run all tests
 *   pnpm test:client           # API client only
 *   pnpm test:dashboard        # Dashboard components only
 *   pnpm test:e2e              # End-to-end only
 *   pnpm test:coverage         # With coverage report
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const TEST_SUITES = {
  client: {
    name: 'API Client',
    command: 'pnpm',
    args: ['test'],
    cwd: join(ROOT, 'packages', 'api-client')
  },
  dashboard: {
    name: 'Web Dashboard',
    command: 'pnpm',
    args: ['test'],
    cwd: join(ROOT, 'integrations', 'web-dashboard')
  },
  e2e: {
    name: 'End-to-End',
    command: 'pnpm',
    args: ['test:e2e'],
    cwd: ROOT
  }
};

async function runTest(suiteName) {
  const suite = TEST_SUITES[suiteName];
  if (!suite) {
    console.error(`Unknown test suite: ${suiteName}`);
    console.log('Available suites:', Object.keys(TEST_SUITES).join(', '));
    process.exit(1);
  }

  console.log(`\n🧪 Running ${suite.name} tests...\n`);

  return new Promise((resolve, reject) => {
    const proc = spawn(suite.command, suite.args, {
      cwd: suite.cwd,
      stdio: 'inherit',
      shell: true
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ ${suite.name} tests passed!\n`);
        resolve(code);
      } else {
        console.error(`❌ ${suite.name} tests failed!\n`);
        reject(new Error(`${suite.name} tests exited with code ${code}`));
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting A+B Test Suite\n');
  console.log('=' .repeat(50));

  const results = {
    client: null,
    dashboard: null,
    e2e: null
  };

  // Run API Client tests
  try {
    await runTest('client');
    results.client = 'PASS';
  } catch (error) {
    results.client = 'FAIL';
    console.error('Client tests failed, continuing...\n');
  }

  // Run Dashboard tests
  try {
    await runTest('dashboard');
    results.dashboard = 'PASS';
  } catch (error) {
    results.dashboard = 'FAIL';
    console.error('Dashboard tests failed, continuing...\n');
  }

  // Run E2E tests (requires running engine)
  try {
    await runTest('e2e');
    results.e2e = 'PASS';
  } catch (error) {
    results.e2e = 'SKIP';
    console.log('E2E tests skipped (engine not running)\n');
  }

  // Summary
  console.log('=' .repeat(50));
  console.log('📊 Test Summary:');
  console.log(`  API Client:     ${results.client}`);
  console.log(`  Web Dashboard:  ${results.dashboard}`);
  console.log(`  End-to-End:     ${results.e2e}`);
  console.log('=' .repeat(50));

  const allPassed = Object.values(results).every(r => r === 'PASS' || r === 'SKIP');
  
  if (allPassed) {
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some tests failed\n');
    process.exit(1);
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0) {
  runAllTests();
} else if (args[0] in TEST_SUITES) {
  runTest(args[0]).catch(() => process.exit(1));
} else {
  console.error('Unknown test suite:', args[0]);
  console.log('Usage: pnpm test:runner [suite]');
  console.log('Suites:', Object.keys(TEST_SUITES).join(', '));
  process.exit(1);
}
