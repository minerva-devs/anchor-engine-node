/**
 * Test for @anchor-engine/native
 */

// Use tsx to run TypeScript directly
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// For now, test that the DLL exists and loads
import { fileURLToPath } from 'url';
import path from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DLL_PATH = path.join(__dirname, '../lib/win-x64/anchor_core.dll');

console.log('Testing @anchor-engine/native...\n');

// Test 1: Check DLL exists
console.log('1. Checking DLL exists...');
if (existsSync(DLL_PATH)) {
  const stats = require('fs').statSync(DLL_PATH);
  console.log(`   ✅ DLL found: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
} else {
  console.error('   ❌ DLL not found:', DLL_PATH);
  process.exit(1);
}

// Test 2: Load with koffi
console.log('2. Loading DLL with Koffi...');
try {
  const koffi = require('koffi');
  const lib = koffi.load(DLL_PATH);
  console.log('   ✅ DLL loaded successfully\n');
  
  // Test 3: Test database_create
  console.log('3. Testing database_create...');
  const database_create = lib.func('database_create', 'void *', ['string']);
  const db = database_create(':memory:');
  if (db) {
    console.log('   ✅ Database created (pointer:', db + ')\n');
  } else {
    console.error('   ❌ Failed to create database\n');
    process.exit(1);
  }
  
  // Test 4: Test database_get_stats
  console.log('4. Testing database_get_stats...');
  const database_get_stats = lib.func('database_get_stats', 'string', ['void *']);
  const statsJson = database_get_stats(db);
  const stats = JSON.parse(statsJson);
  console.log('   ✅ Stats:', stats, '\n');
  
  // Test 5: Cleanup
  console.log('5. Testing database_destroy...');
  const database_destroy = lib.func('database_destroy', 'void', ['void *']);
  database_destroy(db);
  console.log('   ✅ Database destroyed\n');
  
  console.log('All tests passed! ✅');
  
} catch (error) {
  console.error('Test failed:', error.message);
  process.exit(1);
}
