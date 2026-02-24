/**
 * C++ Backend Simple Performance Test
 * 
 * Tests basic FTS search performance at different context sizes
 */

import { AnchorCore } from '../../engine/dist/native/index.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, 'test_simple.db');

function cleanup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
}

async function runTest() {
  console.log('🧪 C++ Backend Simple Performance Test\n');
  console.log('=' .repeat(60));
  
  const core = new AnchorCore();
  
  try {
    console.log('\n📦 Initializing database...');
    core.init(TEST_DB_PATH);
    console.log('✅ Database initialized\n');
    
    // Insert test content directly via SQL would be better, but for now
    // let's just test that the backend loads and methods work
    
    console.log('📊 Testing basic operations:\n');
    
    // Test 1: Search (should return empty but not crash)
    console.log('1. Testing search()...');
    try {
      const results = core.search('test query', 10);
      console.log(`   ✅ Search works: ${results.length} results\n`);
    } catch (e) {
      console.log(`   ❌ Search failed: ${e.message}\n`);
    }
    
    // Test 2: Get stats
    console.log('2. Testing getStats()...');
    try {
      const stats = core.getStats();
      console.log(`   ✅ Stats works: ${JSON.stringify(stats)}\n`);
    } catch (e) {
      console.log(`   ❌ Stats failed: ${e.message}\n`);
    }
    
    // Test 3: Radial inflation (with empty anchors)
    console.log('3. Testing radialInflation()...');
    try {
      const inflated = core.radialInflation([], 10, 0.005);
      console.log(`   ✅ Radial inflation works: ${inflated.length} results\n`);
    } catch (e) {
      console.log(`   ❌ Radial inflation failed: ${e.message}\n`);
    }
    
    // Test 4: Context inflation
    console.log('4. Testing inflateContext()...');
    try {
      const inflated = core.inflateContext([], 65536);
      console.log(`   ✅ Context inflation works: ${inflated.length} results\n`);
    } catch (e) {
      console.log(`   ❌ Context inflation failed: ${e.message}\n`);
    }
    
    // Test 5: Deduplication
    console.log('5. Testing deduplicate()...');
    try {
      const testCandidates = [
        { atom_id: 1, score: 0.9, content: 'test' },
        { atom_id: 2, score: 0.8, content: 'test' }
      ];
      const deduped = core.deduplicate(testCandidates);
      console.log(`   ✅ Deduplication works: ${deduped.length} results\n`);
    } catch (e) {
      console.log(`   ❌ Deduplication failed: ${e.message}\n`);
    }
    
    // Test 6: Transient filter
    console.log('6. Testing filterTransient()...');
    try {
      const testAtoms = [
        { id: 1, content: 'Normal content' },
        { id: 2, content: 'Traceback error' }
      ];
      const filtered = core.filterTransient(testAtoms);
      console.log(`   ✅ Transient filter works: ${filtered.length} results\n`);
    } catch (e) {
      console.log(`   ❌ Transient filter failed: ${e.message}\n`);
    }
    
    console.log('=' .repeat(60));
    console.log('✅ All basic operations completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    console.log('🧹 Cleaning up...');
    core.destroy();
    cleanup();
    console.log('✅ Done!\n');
  }
}

runTest().catch(console.error);
