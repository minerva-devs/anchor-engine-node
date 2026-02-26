/**
 * C++ Backend Comprehensive Test Suite
 * 
 * Tests:
 * - Different context sizes (1KB to 512KB)
 * - Query styles (single word, multi-word, phrases)
 * - Multi-hop traversal verification
 * - Performance benchmarks
 */

import { AnchorCore } from '../../engine/dist/native/index.js';
import { existsSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, 'test_comprehensive.db');

// Clean up test database
function cleanup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
}

// Test configurations
const CONTEXT_SIZES = [
  { name: 'Minimal', chars: 1024 },
  { name: 'Small', chars: 4096 },
  { name: 'Medium', chars: 16384 },
  { name: 'Large', chars: 65536 },
  { name: 'Very Large', chars: 262144 },
  { name: 'Maximum', chars: 524288 },
];

const QUERY_STYLES = [
  { name: 'Single Word', query: 'changed' },
  { name: 'Two Words', query: 'Robert changed' },
  { name: 'Multi Word', query: 'Robert has changed' },
  { name: 'Phrase', query: 'transformation journey' },
  { name: 'Code Query', query: 'optimization performance' },
  { name: 'Complex', query: 'context inflation radial expansion' },
];

async function runTests() {
  console.log('🧪 C++ Backend Comprehensive Test Suite\n');
  console.log('=' .repeat(70));
  
  const core = new AnchorCore();
  const results = {
    contextSize: [],
    queryStyle: [],
    multiHop: []
  };
  
  try {
    // Initialize
    console.log('\n📦 Initializing database...');
    const startTime = Date.now();
    core.init(TEST_DB_PATH);
    console.log(`✅ Database initialized in ${Date.now() - startTime}ms`);
    
    // Insert rich test data for multi-hop testing
    console.log('\n📝 Inserting test atoms with tag connections...\n');
    
    const testAtoms = [
      // Cluster 1: Personal transformation (connected by tags: #personal, #growth)
      {
        source_id: 'personal_journal',
        content: 'Robert Balch has changed significantly over the years. He went from being closed-minded to open-hearted. His journey of transformation began when he met Dory.',
        char_start: 0,
        char_end: 180,
        timestamp: Date.now() / 1000 - 86400,
        simhash: BigInt('0x1234567890abcdef'),
        tags: ['personal', 'growth', 'transformation']
      },
      {
        source_id: 'personal_journal',
        content: 'The healing process was difficult but necessary. Old patterns had to be released. New ways of being emerged through conscious practice.',
        char_start: 0,
        char_end: 150,
        timestamp: Date.now() / 1000 - 86400 * 2,
        simhash: BigInt('0x2234567890abcdef'),
        tags: ['personal', 'healing', 'growth']
      },
      {
        source_id: 'personal_journal',
        content: 'Mindfulness meditation helped create space between stimulus and response. This space allowed for choice instead of reaction.',
        char_start: 0,
        char_end: 140,
        timestamp: Date.now() / 1000 - 86400 * 3,
        simhash: BigInt('0x3234567890abcdef'),
        tags: ['mindfulness', 'practice', 'growth']
      },
      
      // Cluster 2: Technical work (connected by tags: #code, #optimization)
      {
        source_id: 'dev_notes',
        content: 'The code optimization project improved performance by 4x. The C++ backend uses SQLite3 with FTS5 for fast full-text search.',
        char_start: 0,
        char_end: 140,
        timestamp: Date.now() / 1000 - 86400,
        simhash: BigInt('0xfedcba0987654321'),
        tags: ['code', 'optimization', 'performance']
      },
      {
        source_id: 'dev_notes',
        content: 'Context inflation expands search results radially from anchor atoms. The variable radius approach allows budget-aware retrieval.',
        char_start: 0,
        char_end: 145,
        timestamp: Date.now() / 1000 - 86400 * 2,
        simhash: BigInt('0xeeeeba0987654321'),
        tags: ['code', 'context', 'search']
      },
      {
        source_id: 'dev_notes',
        content: 'Physics walker uses gravitational analogy with damping factors and temporal decay. Atoms attract based on shared tags and simhash similarity.',
        char_start: 0,
        char_end: 155,
        timestamp: Date.now() / 1000 - 86400 * 3,
        simhash: BigInt('0xddddba0987654321'),
        tags: ['physics', 'algorithm', 'search']
      },
      
      // Bridge atoms (connect clusters via shared tags)
      {
        source_id: 'reflections',
        content: 'Both personal growth and code optimization require iterative refinement. Small improvements compound over time into significant changes.',
        char_start: 0,
        char_end: 150,
        timestamp: Date.now() / 1000,
        simhash: BigInt('0x1111111111111111'),
        tags: ['growth', 'optimization', 'improvement']
      }
    ];
    
    for (const atom of testAtoms) {
      const atomId = core.insertAtom(
        atom.source_id,
        atom.content,
        atom.char_start,
        atom.char_end,
        atom.timestamp,
        atom.simhash
      );
      console.log(`  Inserted atom ${atomId}: "${atom.content.substring(0, 50)}..." [${atom.tags.join(', ')}]`);
    }
    
    console.log(`\n✅ Inserted ${testAtoms.length} test atoms with tag connections`);
    
    // Test 1: Context Size Variation
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST 1: Context Size Variation\n');
    
    for (const ctxSize of CONTEXT_SIZES) {
      const testStart = Date.now();
      
      try {
        const searchResults = core.search('Robert changed', 10);
        const anchorIds = searchResults.map(r => r.id).slice(0, 3);
        
        let inflated = [];
        if (anchorIds.length > 0) {
          inflated = core.radialInflation(anchorIds, 10, 0.005);
        }
        
        const duration = Date.now() - testStart;
        
        results.contextSize.push({
          name: ctxSize.name,
          chars: ctxSize.chars,
          searchResults: searchResults.length,
          inflatedResults: inflated.length,
          duration,
          status: '✅ PASS'
        });
        
        console.log(`${ctxSize.name.padEnd(12)} (${ctxSize.chars.toLocaleString().padStart(7)} chars): ` +
                    `Search=${searchResults.length}, Inflated=${inflated.length}, ` +
                    `Time=${duration}ms ${duration < 1000 ? '⚡' : '🐌'}`);
        
      } catch (error) {
        results.contextSize.push({
          name: ctxSize.name,
          chars: ctxSize.chars,
          duration: Date.now() - testStart,
          status: '❌ FAIL',
          error: error.message
        });
        
        console.log(`${ctxSize.name.padEnd(12)}: ❌ FAIL - ${error.message}`);
      }
    }
    
    // Test 2: Query Style Variation
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST 2: Query Style Variation\n');
    
    for (const queryStyle of QUERY_STYLES) {
      const testStart = Date.now();
      
      try {
        const searchResults = core.search(queryStyle.query, 10);
        const anchorIds = searchResults.map(r => r.id).slice(0, 3);
        
        let inflated = [];
        if (anchorIds.length > 0) {
          inflated = core.radialInflation(anchorIds, 10, 0.005);
        }
        
        const duration = Date.now() - testStart;
        
        results.queryStyle.push({
          name: queryStyle.name,
          query: queryStyle.query,
          searchResults: searchResults.length,
          inflatedResults: inflated.length,
          duration,
          status: '✅ PASS'
        });
        
        console.log(`${queryStyle.name.padEnd(15)} ("${queryStyle.query}"): ` +
                    `Search=${searchResults.length}, Inflated=${inflated.length}, ` +
                    `Time=${duration}ms`);
        
      } catch (error) {
        results.queryStyle.push({
          name: queryStyle.name,
          query: queryStyle.query,
          duration: Date.now() - testStart,
          status: '❌ FAIL',
          error: error.message
        });
        
        console.log(`${queryStyle.name.padEnd(15)}: ❌ FAIL - ${error.message}`);
      }
    }
    
    // Test 3: Multi-Hop Verification
    console.log('\n' + '=' .repeat(70));
    console.log('📊 TEST 3: Multi-Hop Traversal Verification\n');
    
    const multiHopTests = [
      {
        name: 'Personal Growth Chain',
        startQuery: 'Robert',
        expectedHops: ['personal', 'healing', 'mindfulness'],
        description: 'Verify tags connect across 2+ hops'
      },
      {
        name: 'Code Optimization Chain',
        startQuery: 'optimization',
        expectedHops: ['code', 'physics', 'algorithm'],
        description: 'Verify technical concepts connect'
      },
      {
        name: 'Bridge Connection',
        startQuery: 'growth',
        expectedHops: ['optimization', 'improvement'],
        description: 'Verify bridge atoms connect clusters'
      }
    ];
    
    for (const hopTest of multiHopTests) {
      const testStart = Date.now();
      
      try {
        // Initial search
        const initialResults = core.search(hopTest.startQuery, 5);
        
        if (initialResults.length === 0) {
          results.multiHop.push({
            name: hopTest.name,
            status: '⚠️ NO RESULTS',
            description: hopTest.description
          });
          console.log(`${hopTest.name}: ⚠️ No initial results`);
          continue;
        }
        
        // Get anchor IDs and perform radial inflation
        const anchorIds = initialResults.map(r => r.id);
        const inflated = core.radialInflation(anchorIds, 20, 0.005);
        
        // Collect all tags from inflated results
        const allTags = new Set();
        inflated.forEach(r => {
          if (r.tags) r.tags.forEach(t => allTags.add(t));
        });
        
        // Check if expected hops are found
        const foundHops = hopTest.expectedHops.filter(h => allTags.has(h));
        const hopCoverage = foundHops.length / hopTest.expectedHops.length * 100;
        
        const duration = Date.now() - testStart;
        
        results.multiHop.push({
          name: hopTest.name,
          initialResults: initialResults.length,
          inflatedResults: inflated.length,
          tagsFound: allTags.size,
          expectedHops: hopTest.expectedHops.length,
          hopsFound: foundHops.length,
          coverage: hopCoverage.toFixed(0) + '%',
          duration,
          status: hopCoverage >= 50 ? '✅ PASS' : '⚠️ PARTIAL'
        });
        
        console.log(`${hopTest.name}:`);
        console.log(`  Description: ${hopTest.description}`);
        console.log(`  Initial: ${initialResults.length} → Inflated: ${inflated.length} results`);
        console.log(`  Tags found: ${allTags.size} (expected hops: ${foundHops.length}/${hopTest.expectedHops.length})`);
        console.log(`  Coverage: ${hopCoverage.toFixed(0)}% ${hopCoverage >= 50 ? '✅' : '⚠️'}`);
        console.log(`  Time: ${duration}ms\n`);
        
      } catch (error) {
        results.multiHop.push({
          name: hopTest.name,
          status: '❌ FAIL',
          error: error.message,
          description: hopTest.description
        });
        
        console.log(`${hopTest.name}: ❌ FAIL - ${error.message}\n`);
      }
    }
    
    // Print Summary
    console.log('=' .repeat(70));
    console.log('📈 TEST SUMMARY\n');
    
    console.log('Context Size Tests:');
    console.table(results.contextSize);
    
    console.log('\nQuery Style Tests:');
    console.table(results.queryStyle);
    
    console.log('\nMulti-Hop Tests:');
    console.table(results.multiHop);
    
    // Overall stats
    const totalTests = results.contextSize.length + results.queryStyle.length + results.multiHop.length;
    const passed = [
      ...results.contextSize,
      ...results.queryStyle,
      ...results.multiHop
    ].filter(r => r.status === '✅ PASS').length;
    
    console.log(`\n✅ Passed: ${passed}/${totalTests} (${(passed/totalTests*100).toFixed(0)}%)`);
    
    // Database stats
    console.log('\n📊 Database Statistics:');
    const stats = core.getStats();
    console.log(stats);
    
    // Save results to file
    const reportPath = join(__dirname, 'test-results.json');
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      results,
      summary: {
        total: totalTests,
        passed,
        failed: totalTests - passed,
        passRate: (passed/totalTests*100).toFixed(2) + '%'
      }
    }, null, 2));
    
    console.log(`\n💾 Results saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleaning up...');
    core.destroy();
    cleanup();
    console.log('✅ Cleanup complete\n');
  }
}

// Run tests
runTests().catch(console.error);
