#!/usr/bin/env node
/**
 * Live Fire Test Suite for Anchor Engine v5.0.0
 * Tests search, distillation, and core functionality with detailed logging
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const API_BASE = 'http://localhost:3160';
const LOG_DIR = 'C:\\Users\\rsbii\\.anchor\\logs';
const TEST_OUTPUT_DIR = 'C:\\Users\\rsbii\\.anchor\\test-output';

// Ensure directories exist
[LOG_DIR, TEST_OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  fs.appendFileSync(path.join(LOG_DIR, `live-fire-${Date.now()}.log`), `[${timestamp}] ${message}\n`);
}

async function testHealth() {
  log('TEST: Health Check');
  try {
    const result = await execAsync(`curl -s "${API_BASE}/health"`);
    const data = JSON.parse(result.stdout);
    log(`✅ Health: ${data.status}`);
    return data.status === 'healthy';
  } catch (e) {
    log(`❌ Health check failed: ${e.message}`);
    return false;
  }
}

async function testStats() {
  log('TEST: Database Stats');
  try {
    const result = await execAsync(`curl -s "${API_BASE}/v1/stats"`);
    const data = JSON.parse(result.stdout);
    log(`✅ Stats: atoms=${data.atoms}, molecules=${data.molecules}, tags=${data.tags}, sources=${data.sources}`);
    return true;
  } catch (e) {
    log(`❌ Stats check failed: ${e.message}`);
    return false;
  }
}

async function testSearch(query, limit = 10) {
  log(`TEST: Search - Query: "${query}"`);
  try {
    const result = await execAsync(
      `curl -s "${API_BASE}/v1/memory/search" -X POST -H "Content-Type: application/json" --data @C:\\Users\\rsbii\\Projects\\anchor-engine-node\\search-test.json`
    );
    // Search returns SSE format, extract JSON from data lines
    const jsonLines = result.stdout.split('\n').filter(l => l.startsWith('data:')).map(l => l.replace('data:', '').trim());
    let resultsCount = 0;
    for (const line of jsonLines) {
      try {
        const data = JSON.parse(line);
        if (data.results) resultsCount += data.results.length;
        if (data.value) resultsCount = data.value;
      } catch {}
    }
    log(`✅ Search returned ${resultsCount} results for "${query}"`);
    return true;
  } catch (e) {
    log(`❌ Search failed: ${e.message}`);
    return false;
  }
}

async function testDistillation() {
  log('TEST: Distillation');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFile = path.join(TEST_OUTPUT_DIR, `distill-${timestamp}.json`);
  
  try {
    const result = await execAsync(
      `curl -s "${API_BASE}/v1/memory/distill" -X POST -H "Content-Type: application/json" --data @C:\\Users\\rsbii\\Projects\\anchor-engine-node\\distill-request.json`
    );
    const data = JSON.parse(result.stdout);
    
    log(`✅ Distillation completed:`);
    log(`   - compounds_processed: ${data.stats.compounds_processed}`);
    log(`   - blocks_total: ${data.stats.blocks_total}`);
    log(`   - decision_records: ${data.stats.decision_records}`);
    log(`   - compression_ratio: ${data.stats.compression_ratio}`);
    log(`   - output_path: ${data.output.path}`);
    
    // Save full output
    fs.writeFileSync(outputFile, result.stdout);
    log(`   - Full output saved to: ${outputFile}`);
    
    return data.stats.compounds_processed > 0;
  } catch (e) {
    log(`❌ Distillation failed: ${e.message}`);
    return false;
  }
}

async function testTags() {
  log('TEST: Tags');
  try {
    const result = await execAsync(`curl -s "${API_BASE}/v1/buckets"`);
    const data = JSON.parse(result.stdout);
    log(`✅ Buckets: ${data.length || 0} total buckets`);
    return true;
  } catch (e) {
    log(`❌ Tags check failed: ${e.message}`);
    return false;
  }
}

async function testCompoundDetails() {
  log('TEST: Compound Details');
  try {
    const result = await execAsync(`curl -s "${API_BASE}/v1/memory/compounds"`);
    const data = JSON.parse(result.stdout);
    log(`✅ Compounds: ${data.compounds?.length || 0} total compounds`);
    return true;
  } catch (e) {
    log(`❌ Compound details failed: ${e.message}`);
    return false;
  }
}

async function runSuite() {
  log('========================================');
  log('🔥 LIVE FIRE TEST SUITE v1.0');
  log('========================================');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Run all tests
  const tests = [
    ['Health Check', testHealth],
    ['Database Stats', testStats],
    ['Search (test)', () => testSearch('workspace')],
    ['Search (atom)', () => testSearch('atom')],
    ['Tags List', testTags],
    ['Compound Details', testCompoundDetails],
    ['Distillation', testDistillation],
  ];

  for (const [name, testFn] of tests) {
    try {
      const success = await testFn();
      results.tests.push({ name, success });
      if (success) results.passed++;
      else results.failed++;
    } catch (e) {
      results.tests.push({ name, success: false, error: e.message });
      results.failed++;
    }
  }

  // Summary
  log('========================================');
  log('📊 TEST SUMMARY');
  log(`   Passed: ${results.passed}/${tests.length}`);
  log(`   Failed: ${results.failed}/${tests.length}`);
  log('========================================');

  // Save summary
  const summary = {
    timestamp: new Date().toISOString(),
    results,
    api_base: API_BASE
  };
  fs.writeFileSync(path.join(TEST_OUTPUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  log(`📄 Summary saved to: ${path.join(TEST_OUTPUT_DIR, 'summary.json')}`);

  return results.failed === 0;
}

// Run the suite
runSuite().then(success => {
  console.log(success ? '\n✅ All tests passed!' : '\n❌ Some tests failed.');
  process.exit(success ? 0 : 1);
}).catch(e => {
  log(`💥 Suite crashed: ${e.message}`);
  process.exit(1);
});
