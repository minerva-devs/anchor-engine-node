/**
 * Test script for N-API bindings
 * 
 * Run with: node tests/unit/test_napi_bindings.js
 */

import { Database, PhysicsWalker } from '../../engine/native/anchor_core.node';

console.log('Testing N-API Bindings...\n');

// Test 1: Database creation
console.log('Test 1: Database creation');
try {
  const db = new Database();
  console.log('✅ In-memory database created\n');
  
  // Test 2: Database stats
  console.log('Test 2: Database stats');
  const stats = db.getStats();
  console.log('   Stats:', stats);
  console.log('✅ Stats retrieved\n');
  
  // Test 3: Insert atom
  console.log('Test 3: Insert atom');
  const atomId = db.insertAtom({
    source_id: 'test-source',
    content: 'Hello World from N-API!',
    char_start: 0,
    char_end: 25,
    timestamp: Date.now() / 1000,
    simhash: BigInt('0x1234567890ABCDEF')
  });
  console.log('   Inserted atom ID:', atomId);
  console.log('✅ Atom inserted\n');
  
  // Test 4: Search
  console.log('Test 4: Search atoms');
  const results = db.searchAtoms('Hello', 100);
  console.log('   Search results:', results.length);
  console.log('✅ Search completed\n');
  
  // Test 5: Get updated stats
  console.log('Test 5: Updated stats');
  const updatedStats = db.getStats();
  console.log('   Updated stats:', updatedStats);
  console.log('✅ Stats updated\n');
  
  // Test 6: Wipe data
  console.log('Test 6: Wipe all data');
  db.wipeAllData();
  const wipedStats = db.getStats();
  console.log('   Stats after wipe:', wipedStats);
  console.log('✅ Data wiped\n');
  
  // Test 7: Close database
  console.log('Test 7: Close database');
  db.close();
  console.log('✅ Database closed\n');
  
  console.log('All tests passed! ✅');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
