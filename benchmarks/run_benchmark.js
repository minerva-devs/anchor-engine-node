#!/usr/bin/env node
/**
 * Anchor Engine - Reproducible Benchmark Runner
 * 
 * Runs standardized benchmarks for ingestion and search performance.
 * Generates reproducible results that can be compared against expected values.
 * 
 * Usage:
 *   node benchmarks/run_benchmark.js --seed 42
 *   node benchmarks/run_benchmark.js --seed 42 --db ./benchmarks/test_db
 *   node benchmarks/run_benchmark.js --compare  # Compare with expected results
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Benchmark configuration
const CONFIG = {
  seed: 42,
  dbPath: join(__dirname, 'test_db'),
  sampleCorpusPath: join(__dirname, 'sample_corpus.jsonl'),
  resultsPath: join(__dirname, 'last_run_results.json'),
  expectedPath: join(__dirname, 'expected_results.json'),
  numDocuments: 200
};

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    seed: CONFIG.seed,
    dbPath: CONFIG.dbPath,
    compare: false,
    generateOnly: false
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--seed' && args[i + 1]) {
      options.seed = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--db' && args[i + 1]) {
      options.dbPath = args[i + 1];
      i++;
    } else if (args[i] === '--compare') {
      options.compare = true;
    } else if (args[i] === '--generate-only') {
      options.generateOnly = true;
    }
  }
  
  return options;
}

// Generate sample corpus
function generateCorpus(seed, numDocuments) {
  console.log('📊 Generating sample corpus...');
  const generatorPath = join(__dirname, 'sample-corpus-generator.js');
  
  try {
    execSync(`node "${generatorPath}" --seed ${seed} --count ${numDocuments} --output "${CONFIG.sampleCorpusPath}"`, {
      stdio: 'inherit',
      cwd: PROJECT_ROOT
    });
    console.log('✅ Corpus generated\n');
  } catch (error) {
    console.error('❌ Failed to generate corpus:', error.message);
    process.exit(1);
  }
}

// Run ingestion benchmark
async function runIngestionBenchmark() {
  console.log('⏱️  Running ingestion benchmark...');
  
  const startTime = Date.now();
  let moleculesProcessed = 0;
  let atomsProcessed = 0;
  
  try {
    // Import engine modules (compiled dist files)
    const { db } = await import('../engine/dist/core/db.js');
    const { AtomizerService } = await import('../engine/dist/services/ingest/atomizer-service.js');
    const { AtomicIngestService } = await import('../engine/dist/services/ingest/ingest-atomic.js');
    
    // Initialize database
    await db.init();
    
    // Read sample corpus
    const corpusData = readFileSync(CONFIG.sampleCorpusPath, 'utf-8');
    const documents = corpusData.split('\n').filter(line => line.trim()).map(line => JSON.parse(line));
    
    console.log(`Processing ${documents.length} documents...`);
    
    const atomizer = new AtomizerService();
    const atomicIngest = new AtomicIngestService();
    
    for (const doc of documents) {
      const content = `${doc.title}\n\n${doc.text}`;
      const source = `benchmark:${doc.id}`;
      
      // Atomize
      const atomizeResult = await atomizer.atomize(content, source, 'internal');
      if (atomizeResult) {
        moleculesProcessed += atomizeResult.molecules.length;
        atomsProcessed += atomizeResult.atoms.length;
        
        // Ingest
        await atomicIngest.ingestResult(
          atomizeResult.compound,
          atomizeResult.molecules,
          atomizeResult.atoms,
          ['benchmark']
        );
      }
    }
    
    const totalTime = (Date.now() - startTime) / 1000;
    
    console.log('✅ Ingestion complete\n');
    
    return {
      totalTime,
      moleculesProcessed,
      atomsProcessed,
      moleculesPerSecond: moleculesProcessed / totalTime,
      atomsPerSecond: atomsProcessed / totalTime,
      bytesPerSecond: (Buffer.byteLength(corpusData, 'utf-8') / totalTime / 1024 / 1024)
    };
  } catch (error) {
    console.error('❌ Ingestion benchmark failed:', error.message);
    throw error;
  }
}

// Run search benchmark
async function runSearchBenchmark() {
  console.log('🔍 Running search benchmark...');
  
  const queries = [
    'artificial intelligence',
    'machine learning',
    'context retrieval',
    'software architecture',
    'database systems'
  ];
  
  const results = [];
  let totalLatency = 0;
  
  try {
    const { executeSearch } = await import('../engine/dist/services/search/search.js');
    
    for (const query of queries) {
      const startTime = Date.now();
      
      const searchResult = await executeSearch(
        query,
        undefined,
        ['benchmark'],
        4096,
        false,
        'all'
      );
      
      const latency = Date.now() - startTime;
      totalLatency += latency;
      
      results.push({
        query,
        latency,
        numResults: searchResult.results?.length || 0
      });
      
      console.log(`  "${query}": ${latency}ms (${searchResult.results?.length || 0} results)`);
    }
    
    const avgLatency = totalLatency / queries.length;
    console.log('✅ Search complete\n');
    
    return {
      queriesTested: queries.length,
      avgLatency,
      minLatency: Math.min(...results.map(r => r.latency)),
      maxLatency: Math.max(...results.map(r => r.latency)),
      results
    };
  } catch (error) {
    console.error('❌ Search benchmark failed:', error.message);
    throw error;
  }
}

// Compare results with expected
function compareResults(results) {
  console.log('📈 Comparing with expected results...\n');
  
  if (!existsSync(CONFIG.expectedPath)) {
    console.warn('⚠️  No expected results file found. Skipping comparison.\n');
    return { passed: false, message: 'No expected results file' };
  }
  
  const expected = JSON.parse(readFileSync(CONFIG.expectedPath, 'utf-8'));
  
  // Check key metrics
  const checks = [
    {
      name: 'Ingestion throughput',
      actual: results.ingestion.moleculesPerSecond,
      expected: expected.ingestion.moleculesPerSecond,
      tolerance: 0.2 // 20% tolerance
    },
    {
      name: 'Search latency',
      actual: results.search.avgLatency,
      expected: expected.search.avgLatency,
      tolerance: 0.3, // 30% tolerance (higher for search due to variability)
      lowerIsBetter: true
    }
  ];
  
  let allPassed = true;
  
  for (const check of checks) {
    const diff = Math.abs(check.actual - check.expected) / check.expected;
    const passed = diff <= check.tolerance;
    
    if (!passed) allPassed = false;
    
    const status = passed ? '✅' : '❌';
    const direction = check.lowerIsBetter ? '<' : '>';
    
    console.log(`${status} ${check.name}:`);
    console.log(`    Expected: ${check.expected.toFixed(2)}`);
    console.log(`    Actual:   ${check.actual.toFixed(2)}`);
    console.log(`    Diff:     ${(diff * 100).toFixed(1)}% ${direction} ${(check.tolerance * 100).toFixed(0)}%\n`);
  }
  
  return {
    passed: allPassed,
    checks
  };
}

// Main execution
async function main() {
  const options = parseArgs();
  
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     Anchor Engine - Reproducible Benchmark Suite      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log(`Configuration:`);
  console.log(`  Seed: ${options.seed}`);
  console.log(`  Database: ${options.dbPath}`);
  console.log(`  Documents: ${CONFIG.numDocuments}\n`);
  
  // Clean up previous test database
  if (existsSync(options.dbPath)) {
    console.log('🧹 Cleaning up previous test database...');
    rmSync(options.dbPath, { recursive: true, force: true });
  }
  
  // Generate corpus
  generateCorpus(options.seed, CONFIG.numDocuments);
  
  if (options.generateOnly) {
    console.log('✅ Corpus generation complete. Exiting.\n');
    process.exit(0);
  }
  
  // Create database directory
  mkdirSync(options.dbPath, { recursive: true });
  process.env.CONTEXT_DB_PATH = options.dbPath;
  
  // Run benchmarks
  const results = {
    timestamp: new Date().toISOString(),
    seed: options.seed,
    numDocuments: CONFIG.numDocuments
  };
  
  try {
    results.ingestion = await runIngestionBenchmark();
    results.search = await runSearchBenchmark();
    
    // Save results
    writeFileSync(CONFIG.resultsPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📊 Results saved to: ${CONFIG.resultsPath}\n`);
    
    // Compare with expected if requested
    if (options.compare) {
      const comparison = compareResults(results);
      
      if (comparison.passed) {
        console.log('✅ All benchmark checks PASSED!\n');
        process.exit(0);
      } else {
        console.log('❌ Some benchmark checks FAILED\n');
        process.exit(1);
      }
    }
    
    // Print summary
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                    BENCHMARK SUMMARY                   ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('Ingestion Performance:');
    console.log(`  Total time:        ${results.ingestion.totalTime.toFixed(2)}s`);
    console.log(`  Molecules:         ${results.ingestion.moleculesProcessed.toLocaleString()}`);
    console.log(`  Atoms:             ${results.ingestion.atomsProcessed.toLocaleString()}`);
    console.log(`  Throughput:        ${results.ingestion.moleculesPerSecond.toFixed(0)} molecules/s`);
    console.log(`  Data rate:         ${results.ingestion.bytesPerSecond.toFixed(2)} MB/s\n`);
    
    console.log('Search Performance:');
    console.log(`  Queries tested:    ${results.search.queriesTested}`);
    console.log(`  Avg latency:       ${results.search.avgLatency.toFixed(0)}ms`);
    console.log(`  Min latency:       ${results.search.minLatency.toFixed(0)}ms`);
    console.log(`  Max latency:       ${results.search.maxLatency.toFixed(0)}ms\n`);
    
  } catch (error) {
    console.error('\n❌ Benchmark failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
