#!/usr/bin/env node

/**
 * C++ Backend Benchmark Suite
 * 
 * Comprehensive benchmarks comparing C++ SQLite3 backend vs PGlite
 * 
 * Tests:
 * 1. Memory Usage - RSS during operations
 * 2. Search Latency - p50, p95, p99
 * 3. Ingestion Throughput - atoms/second
 * 4. Physics Walker - Radial inflation speed
 * 
 * Usage:
 *   node benchmarks/run-all.js
 *   node benchmarks/memory-bench.js
 *   node benchmarks/search-bench.js
 *   node benchmarks/ingestion-bench.js
 */

import { AnchorCore } from '../index.js';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEST_DB = join(process.cwd(), 'test-benchmark.db');
const RESULTS_DIR = join(process.cwd(), 'results');

// Ensure results directory exists
if (!existsSync(RESULTS_DIR)) {
  import('fs').then(fs => fs.mkdirSync(RESULTS_DIR, { recursive: true }));
}

// Cleanup
function cleanup() {
  if (existsSync(TEST_DB)) {
    rmSync(TEST_DB);
  }
}

// Statistics helpers
function calculateStats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[n - 1],
    mean: sorted.reduce((a, b) => a + b, 0) / n,
    p50: sorted[Math.floor(n * 0.50)],
    p95: sorted[Math.floor(n * 0.95)],
    p99: sorted[Math.floor(n * 0.99)],
    count: n
  };
}

function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Memory benchmark
async function runMemoryBenchmark() {
  console.log('\n📊 Memory Benchmark\n');
  console.log('=' .repeat(60));
  
  const core = new AnchorCore();
  const results = {
    timestamps: [],
    rss: [],
    heap: []
  };
  
  try {
    // Initialize
    console.log('Initializing database...');
    const initStart = process.hrtime.bigint();
    core.init(TEST_DB);
    const initEnd = process.hrtime.bigint();
    const initTime = Number(initEnd - initStart) / 1e6;
    console.log(`✅ Initialized in ${formatDuration(initTime)}`);
    
    // Insert test data
    console.log('\nInserting test data...');
    const testAtoms = [];
    for (let i = 0; i < 1000; i++) {
      testAtoms.push({
        source_id: 'benchmark_source',
        content: `Test atom ${i} - This is sample content for benchmarking memory usage. Lorem ipsum dolor sit amet, consectetur adipiscing elit.`,
        char_start: 0,
        char_end: 120,
        timestamp: Date.now() / 1000,
        simhash: BigInt(`0x${Math.random().toString(16).substring(2, 18)}`)
      });
    }
    
    const insertStart = process.hrtime.bigint();
    for (const atom of testAtoms) {
      core.insertAtom(
        atom.source_id,
        atom.content,
        atom.char_start,
        atom.char_end,
        atom.timestamp,
        atom.simhash
      );
    }
    const insertEnd = process.hrtime.bigint();
    const insertTime = Number(insertEnd - insertStart) / 1e6;
    console.log(`✅ Inserted ${testAtoms.length} atoms in ${formatDuration(insertTime)}`);
    
    // Measure memory during operations
    console.log('\nMeasuring memory during operations...');
    const operations = ['search', 'radialInflation', 'deduplicate', 'contextInflation'];
    
    for (const op of operations) {
      const memBefore = process.memoryUsage();
      
      // Perform operation
      switch (op) {
        case 'search':
          core.search('test', 100);
          break;
        case 'radialInflation':
          const results = core.search('test', 10);
          if (results.length > 0) {
            const ids = results.slice(0, 3).map(r => r.id);
            core.radialInflation(ids, 50, 0.005);
          }
          break;
        case 'deduplicate':
          const candidates = Array(100).fill(null).map((_, i) => ({
            atom_id: i,
            score: Math.random(),
            content: `test ${i}`
          }));
          core.deduplicate(candidates);
          break;
        case 'contextInflation':
          const atoms = core.search('test', 5);
          if (atoms.length > 0) {
            const ids = atoms.map(a => a.id);
            core.inflateContext(ids, 65536);
          }
          break;
      }
      
      const memAfter = process.memoryUsage();
      
      results.timestamps.push(op);
      results.rss.push({
        before: memBefore.rss / 1024 / 1024,
        after: memAfter.rss / 1024 / 1024,
        delta: (memAfter.rss - memBefore.rss) / 1024 / 1024
      });
      
      console.log(`  ${op}: RSS ${memBefore.rss / 1024 / 1024 | 0}MB → ${memAfter.rss / 1024 / 1024 | 0}MB (${(memAfter.rss - memBefore.rss) / 1024 / 1024 | 0}MB)`);
    }
    
    // Get final stats
    const stats = core.getStats();
    console.log('\n📈 Database Statistics:');
    console.log(`  Atoms: ${stats.atom_count}`);
    console.log(`  Sources: ${stats.source_count}`);
    console.log(`  Tags: ${stats.tag_count}`);
    
    // Save results
    const report = {
      test: 'memory',
      timestamp: new Date().toISOString(),
      initTime,
      insertTime,
      insertCount: testAtoms.length,
      operations: results.timestamps.map((op, i) => ({
        name: op,
        ...results.rss[i]
      })),
      finalStats: stats
    };
    
    const reportPath = join(RESULTS_DIR, 'memory-benchmark.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${reportPath}`);
    
  } finally {
    core.destroy();
    cleanup();
  }
}

// Search latency benchmark
async function runSearchBenchmark() {
  console.log('\n🔍 Search Latency Benchmark\n');
  console.log('=' .repeat(60));
  
  const core = new AnchorCore();
  const latencies = {
    fts: [],
    radial: [],
    inflate: [],
    dedup: []
  };
  
  const ITERATIONS = 100;
  
  try {
    // Initialize with test data
    console.log('Setting up test database...');
    core.init(TEST_DB);
    
    // Insert test atoms
    const testContent = [
      'Robert has changed significantly over the years through personal growth',
      'The code optimization project improved performance by 4x with C++',
      'Context inflation expands search results radially from anchor atoms',
      'Physics walker uses gravitational analogy for graph traversal',
      'Machine learning models require careful hyperparameter tuning'
    ];
    
    for (let i = 0; i < 500; i++) {
      const content = testContent[i % testContent.length] + ` (iteration ${i})`;
      core.insertAtom(
        'benchmark',
        content,
        0,
        content.length,
        Date.now() / 1000,
        BigInt(`0x${Math.random().toString(16).substring(2, 18)}`)
      );
    }
    console.log(`✅ Inserted 500 test atoms`);
    
    // Benchmark FTS search
    console.log(`\nRunning ${ITERATIONS} FTS search iterations...`);
    const queries = ['Robert changed', 'optimization performance', 'context inflation', 'physics walker'];
    
    for (let i = 0; i < ITERATIONS; i++) {
      const query = queries[i % queries.length];
      const start = process.hrtime.bigint();
      core.search(query, 50);
      const end = process.hrtime.bigint();
      latencies.fts.push(Number(end - start) / 1e6);
    }
    
    // Benchmark radial inflation
    console.log(`Running ${ITERATIONS} radial inflation iterations...`);
    const anchors = core.search('optimization', 10);
    if (anchors.length > 0) {
      const anchorIds = anchors.slice(0, 3).map(a => a.id);
      
      for (let i = 0; i < ITERATIONS; i++) {
        const start = process.hrtime.bigint();
        core.radialInflation(anchorIds, 50, 0.005);
        const end = process.hrtime.bigint();
        latencies.radial.push(Number(end - start) / 1e6);
      }
    }
    
    // Benchmark context inflation
    console.log(`Running ${ITERATIONS} context inflation iterations...`);
    const atoms = core.search('Robert', 5);
    if (atoms.length > 0) {
      const atomIds = atoms.map(a => a.id);
      
      for (let i = 0; i < ITERATIONS; i++) {
        const start = process.hrtime.bigint();
        core.inflateContext(atomIds, 65536);
        const end = process.hrtime.bigint();
        latencies.inflate.push(Number(end - start) / 1e6);
      }
    }
    
    // Benchmark deduplication
    console.log(`Running ${ITERATIONS} deduplication iterations...`);
    for (let i = 0; i < ITERATIONS; i++) {
      const candidates = Array(50).fill(null).map((_, j) => ({
        atom_id: j,
        score: Math.random(),
        content: `test content ${j}`,
        tags: ['tag1', 'tag2']
      }));
      
      const start = process.hrtime.bigint();
      core.deduplicate(candidates);
      const end = process.hrtime.bigint();
      latencies.dedup.push(Number(end - start) / 1e6);
    }
    
    // Calculate and display stats
    console.log('\n📈 Results:\n');
    
    const operations = [
      { name: 'FTS Search', data: latencies.fts, unit: 'ms' },
      { name: 'Radial Inflation', data: latencies.radial, unit: 'ms' },
      { name: 'Context Inflation', data: latencies.inflate, unit: 'ms' },
      { name: 'Deduplication', data: latencies.dedup, unit: 'ms' }
    ];
    
    const report = { test: 'search_latency', timestamp: new Date().toISOString(), operations: [] };
    
    for (const op of operations) {
      const stats = calculateStats(op.data);
      report.operations.push({ name: op.name, stats });
      
      console.log(`${op.name}:`);
      console.log(`  p50: ${formatDuration(stats.p50)}`);
      console.log(`  p95: ${formatDuration(stats.p95)}`);
      console.log(`  p99: ${formatDuration(stats.p99)}`);
      console.log(`  mean: ${formatDuration(stats.mean)}`);
      console.log(`  min: ${formatDuration(stats.min)}, max: ${formatDuration(stats.max)}`);
      console.log();
    }
    
    // Save results
    const reportPath = join(RESULTS_DIR, 'search-latency-benchmark.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`💾 Results saved to: ${reportPath}`);
    
  } finally {
    core.destroy();
    cleanup();
  }
}

// Ingestion throughput benchmark
async function runIngestionBenchmark() {
  console.log('\n⚡ Ingestion Throughput Benchmark\n');
  console.log('=' .repeat(60));
  
  const core = new AnchorCore();
  const results = {
    batches: [],
    totalAtoms: 0,
    totalTime: 0
  };
  
  const BATCH_SIZES = [100, 500, 1000, 2000];
  
  try {
    core.init(TEST_DB);
    
    console.log('Testing ingestion at different batch sizes...\n');
    
    for (const batchSize of BATCH_SIZES) {
      console.log(`Batch size: ${batchSize} atoms`);
      
      const atoms = [];
      for (let i = 0; i < batchSize; i++) {
        atoms.push({
          source_id: `source_${i % 10}`,
          content: `Test atom ${i} with sample content for ingestion benchmarking. This content is designed to test the throughput of the C++ backend.`,
          char_start: 0,
          char_end: 120,
          timestamp: Date.now() / 1000 - Math.random() * 86400,
          simhash: BigInt(`0x${Math.random().toString(16).substring(2, 18)}`)
        });
      }
      
      const start = process.hrtime.bigint();
      
      for (const atom of atoms) {
        core.insertAtom(
          atom.source_id,
          atom.content,
          atom.char_start,
          atom.char_end,
          atom.timestamp,
          atom.simhash
        );
      }
      
      const end = process.hrtime.bigint();
      const duration = Number(end - start) / 1e9; // seconds
      
      const throughput = batchSize / duration;
      results.batches.push({
        size: batchSize,
        duration,
        throughput,
        atomsPerSecond: throughput
      });
      results.totalAtoms += batchSize;
      results.totalTime += duration;
      
      console.log(`  ✅ ${batchSize} atoms in ${formatDuration(duration * 1000)}`);
      console.log(`  📊 Throughput: ${throughput.toFixed(0)} atoms/second\n`);
    }
    
    // Overall stats
    const overallThroughput = results.totalAtoms / results.totalTime;
    console.log('=' .repeat(60));
    console.log(`\n📈 Overall Statistics:`);
    console.log(`  Total atoms: ${results.totalAtoms}`);
    console.log(`  Total time: ${formatDuration(results.totalTime * 1000)}`);
    console.log(`  Average throughput: ${overallThroughput.toFixed(0)} atoms/second`);
    
    // Save results
    const report = {
      test: 'ingestion_throughput',
      timestamp: new Date().toISOString(),
      batches: results.batches,
      overall: {
        totalAtoms: results.totalAtoms,
        totalTime: results.totalTime,
        throughput: overallThroughput
      }
    };
    
    const reportPath = join(RESULTS_DIR, 'ingestion-throughput-benchmark.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Results saved to: ${reportPath}`);
    
  } finally {
    core.destroy();
    cleanup();
  }
}

// Run all benchmarks
async function runAll() {
  console.log('🚀 C++ Backend Benchmark Suite\n');
  console.log('=' .repeat(60));
  console.log('Running all benchmarks...\n');
  
  const startTime = Date.now();
  
  try {
    await runMemoryBenchmark();
    await runSearchBenchmark();
    await runIngestionBenchmark();
    
    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`\n✅ All benchmarks completed in ${formatDuration(totalTime * 1000)}\n`);
    console.log('📁 Results saved to:', RESULTS_DIR);
    console.log('\n💡 Tip: Compare results with PGlite baseline using:');
    console.log('   node benchmarks/compare.js\n');
    
  } catch (error) {
    console.error('\n❌ Benchmark failed:', error);
    process.exit(1);
  }
}

// Parse command line
const args = process.argv.slice(2);
const benchmark = args[0] || 'all';

switch (benchmark) {
  case 'memory':
    runMemoryBenchmark().catch(console.error);
    break;
  case 'search':
    runSearchBenchmark().catch(console.error);
    break;
  case 'ingestion':
    runIngestionBenchmark().catch(console.error);
    break;
  case 'all':
  default:
    runAll().catch(console.error);
}
