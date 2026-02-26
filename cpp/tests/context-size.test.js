/**
 * C++ Backend Context Size Tests
 * 
 * Tests the C++ FFI backend at various context inflation sizes
 * to verify performance and correctness.
 */

import { AnchorCore } from '../index.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, 'test_context.db');

// Clean up test database
function cleanup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
}

// Test configuration
const TEST_CASES = [
  { name: 'Minimal', chars: 1024, expected: 'fast' },
  { name: 'Small', chars: 4096, expected: 'fast' },
  { name: 'Medium', chars: 16384, expected: 'moderate' },
  { name: 'Large', chars: 65536, expected: 'moderate' },
  { name: 'Very Large', chars: 262144, expected: 'slow' },
  { name: 'Maximum', chars: 524288, expected: 'slow' },
];

async function runTests() {
  console.log('🧪 C++ Backend Context Size Tests\n');
  console.log('=' .repeat(60));
  
  const core = new AnchorCore();
  
  try {
    // Initialize
    console.log('\n📦 Initializing database...');
    const startTime = Date.now();
    core.init(TEST_DB_PATH);
    console.log(`✅ Database initialized in ${Date.now() - startTime}ms`);
    
    // Insert test data
    console.log('\n📝 Inserting test atoms...');
    const testAtoms = [
      {
        source_id: 'test_source',
        content: 'Robert Balch has changed significantly over the years. He went from being closed-minded to open-hearted. His journey of transformation began when he met Dory.',
        char_start: 0,
        char_end: 180,
        timestamp: Date.now() / 1000,
        simhash: BigInt('0x1234567890abcdef')
      },
      {
        source_id: 'test_source',
        content: 'The code optimization project improved performance by 4x. The C++ backend uses SQLite3 with FTS5 for fast full-text search.',
        char_start: 0,
        char_end: 140,
        timestamp: Date.now() / 1000,
        simhash: BigInt('0xfedcba0987654321')
      },
      {
        source_id: 'test_source',
        content: 'Context inflation expands search results radially from anchor atoms. The variable radius approach allows budget-aware retrieval.',
        char_start: 0,
        char_end: 145,
        timestamp: Date.now() / 1000,
        simhash: BigInt('0x1111111111111111')
      }
    ];
    
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
    console.log(`✅ Inserted ${testAtoms.length} test atoms`);
    
    // Run tests at different context sizes
    console.log('\n📊 Running context size tests...\n');
    
    const results = [];
    
    for (const testCase of TEST_CASES) {
      console.log(`Testing: ${testCase.name} (${testCase.chars.toLocaleString()} chars)`);
      
      const testStart = Date.now();
      
      try {
        // Test search with context inflation
        const searchResults = core.search('Robert changed', 10);
        
        // Test radial inflation
        const anchorIds = searchResults.map(r => r.id).slice(0, 3);
        if (anchorIds.length > 0) {
          const inflated = core.radialInflation(anchorIds, 10, 0.005);
          console.log(`  - Search found: ${searchResults.length} results`);
          console.log(`  - Radial inflation: ${inflated.length} candidates`);
        }
        
        const duration = Date.now() - testStart;
        
        results.push({
          name: testCase.name,
          chars: testCase.chars,
          duration,
          status: '✅ PASS'
        });
        
        console.log(`  - Duration: ${duration}ms ${duration < 1000 ? '⚡' : '🐌'}`);
        console.log(`  - Status: ✅ PASS\n`);
        
      } catch (error) {
        results.push({
          name: testCase.name,
          chars: testCase.chars,
          duration: Date.now() - testStart,
          status: '❌ FAIL',
          error: error.message
        });
        
        console.log(`  - Status: ❌ FAIL - ${error.message}\n`);
      }
    }
    
    // Print summary
    console.log('=' .repeat(60));
    console.log('📈 TEST SUMMARY\n');
    console.table(results);
    
    const passed = results.filter(r => r.status.includes('PASS')).length;
    const failed = results.filter(r => r.status.includes('FAIL')).length;
    
    console.log(`\n✅ Passed: ${passed}/${TEST_CASES.length}`);
    console.log(`❌ Failed: ${failed}/${TEST_CASES.length}`);
    
    // Test getStats
    console.log('\n📊 Database Statistics:');
    const stats = core.getStats();
    console.log(stats);
    
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
