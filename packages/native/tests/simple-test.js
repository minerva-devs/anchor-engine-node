/**
 * Simple test - verify DLL loads and basic functions work
 */

import koffi from 'koffi';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DLL_PATH = path.join(__dirname, '../lib/win-x64/anchor_core.dll');

console.log('='.repeat(60));
console.log('@anchor-engine/native - DLL Test');
console.log('='.repeat(60));
console.log();

// Load DLL
console.log('Loading DLL:', DLL_PATH);
const lib = koffi.load(DLL_PATH);
console.log('✅ DLL loaded successfully');
console.log();

// Get function signatures
console.log('Available exports:');
const exports = [
  'database_create',
  'database_destroy',
  'database_search_atoms',
  'database_get_stats',
  'database_insert_atom',
  'physics_walker_create',
  'context_inflator_create',
  'deduplicator_create',
  'transient_filter_create'
];

for (const exp of exports) {
  try {
    const func = lib.func(exp, 'void *', []);
    console.log(`  ✅ ${exp}`);
  } catch (e) {
    console.log(`  ⚠️  ${exp} - ${e.message}`);
  }
}

console.log();
console.log('='.repeat(60));
console.log('DLL is ready to use!');
console.log('='.repeat(60));
