/**
 * Test for @anchor-engine/native
 */

import { anchor } from '../index.js';

console.log('Testing @anchor-engine/native...\n');

try {
  // Initialize
  console.log('1. Initializing database...');
  anchor.init(':memory:');
  console.log('   ✅ Database initialized\n');
  
  // Insert test atom
  console.log('2. Inserting test atom...');
  const id = anchor.insertAtom(
    'test-source',
    'This is a test atom for quantum computing research',
    0,
    50,
    Date.now() / 1000,
    0x1234567890ABCDEFn
  );
  console.log(`   ✅ Atom inserted with ID: ${id}\n`);
  
  // Search
  console.log('3. Searching for "quantum"...');
  const results = anchor.search('quantum', 100);
  console.log(`   ✅ Found ${results.length} results\n`);
  
  // Get stats
  console.log('4. Getting statistics...');
  const stats = anchor.getStats();
  console.log(`   ✅ Stats: ${JSON.stringify(stats)}\n`);
  
  // Cleanup
  console.log('5. Cleaning up...');
  anchor.destroy();
  console.log('   ✅ Resources cleaned up\n');
  
  console.log('All tests passed! ✅');
  
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
}
