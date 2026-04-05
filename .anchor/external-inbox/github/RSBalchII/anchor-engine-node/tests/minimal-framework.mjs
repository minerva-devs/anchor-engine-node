#!/usr/bin/env node
/**
 * Minimal Test Framework for Anchor Engine
 * Zero dependencies, native Node.js assert
 * 
 * Usage:
 *   node tests/minimal-framework.mjs                    # Run all tests
 *   node tests/minimal-framework.mjs --grep="search"    # Filter tests
 *   node tests/minimal-framework.mjs --bail             # Stop on first failure
 */

import { strict as assert } from 'assert';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Test registry
const tests = [];
let currentSuite = '';
let isMainModule = false;

// DSL
export function describe(name, fn) {
  currentSuite = name;
  fn();
  currentSuite = '';
}

export function it(name, fn) {
  tests.push({ suite: currentSuite || 'default', name, fn });
}

export { assert };

// Run tests
async function runTests(options = {}) {
  const { grep, bail } = options;
  const startTime = Date.now();
  let passed = 0, failed = 0, skipped = 0;
  
  const filteredTests = grep 
    ? tests.filter(t => (t.suite + ' ' + t.name).includes(grep))
    : tests;
  
  console.log(`\n🧪 Running ${filteredTests.length} tests${grep ? ` (filtered by "${grep}")` : ''}\n`);
  
  for (const test of filteredTests) {
    const testStart = Date.now();
    try {
      await test.fn();
      const duration = Date.now() - testStart;
      console.log(`  ✅ ${test.suite} › ${test.name} (${duration}ms)`);
      passed++;
    } catch (err) {
      const duration = Date.now() - testStart;
      console.log(`  ❌ ${test.suite} › ${test.name} (${duration}ms)`);
      console.log(`     ${err.message.split('\n')[0]}`);
      failed++;
      if (bail) break;
    }
  }
  
  const totalTime = Date.now() - startTime;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log(`Time:  ${totalTime}ms`);
  console.log(`${'='.repeat(60)}\n`);
  
  return failed > 0 ? 1 : 0;
}

// Load and run tests
async function main() {
  const args = process.argv.slice(2);
  const grep = args.find(a => a.startsWith('--grep='))?.split('=')[1];
  const bail = args.includes('--bail');
  
  // Load all .test.mjs files
  const testDir = join(__dirname, 'minimal');
  const files = await readdir(testDir);
  const testFiles = files.filter(f => f.endsWith('.test.mjs'));
  
  console.log(`📁 Loading ${testFiles.length} test files...`);
  
  // Import all test files (they register themselves)
  for (const file of testFiles) {
    await import(join(testDir, file));
  }
  
  // Run tests
  const exitCode = await runTests({ grep, bail });
  process.exit(exitCode);
}

// Check if this is the main module
const isMain = import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
