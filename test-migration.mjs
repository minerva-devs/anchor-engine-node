import { db } from './engine/src/core/db.js';

async function runMigrationTests() {
  console.log('=== Compounds Table Migration Test Suite ===\n');

  let passed = 0;
  let failed = 0;

  async function test(name, condition) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  // Test 1: Verify compounds table does NOT exist
  const tables = await db.run('SELECT name FROM sqlite_master WHERE type="table";');
  const hasCompounds = tables.some(t => t.name === 'compounds');
  
  console.log('[Test 1] Compounds table should not exist...');
  if (!hasCompounds) {
    console.log('✅ PASS: Compounds table does NOT exist (correct)');
    passed++;
  } else {
    console.log('❌ FAIL: Compounds table still exists!');
    failed++;
  }

  // Test 2: Verify molecules table exists with provenance column
  const moleculesInfo = await db.run('PRAGMA table_info(molecules);');
  const hasProvenanceInMolecules = moleculesInfo.some(c => c.name === 'provenance');
  
  console.log('\n[Test 2] Molecules table has provenance column...');
  if (hasProvenanceInMolecules) {
    console.log('✅ PASS: Provenance column exists in molecules table');
    passed++;
  } else {
    console.log('❌ FAIL: Provenance column missing from molecules table');
    failed++;
  }

  // Test 3: Verify atoms table exists with provenance column
  const atomsInfo = await db.run('PRAGMA table_info(atoms);');
  const hasProvenanceInAtoms = atomsInfo.some(c => c.name === 'provenance');
  
  console.log('\n[Test 3] Atoms table has provenance column...');
  if (hasProvenanceInAtoms) {
    console.log('✅ PASS: Provenance column exists in atoms table');
    passed++;
  } else {
    console.log('❌ FAIL: Provenance column missing from atoms table');
    failed++;
  }

  // Test 4: Verify molecules table has molecular_signature column
  const molCols = moleculesInfo.map(c => c.name);
  const hasMolecularSignature = molCols.includes('molecular_signature');
  
  console.log('\n[Test 4] Molecules table has molecular_signature column...');
  if (hasMolecularSignature) {
    console.log('✅ PASS: Molecular signature column exists in molecules table');
    passed++;
  } else {
    console.log('❌ FAIL: Molecular signature column missing from molecules table');
    failed++;
  }

  // Test 5: Verify atoms table has molecular_signature column
  const atomCols = atomsInfo.map(c => c.name);
  const hasMolecularSignatureInAtoms = atomCols.includes('molecular_signature');
  
  console.log('\n[Test 5] Atoms table has molecular_signature column...');
  if (hasMolecularSignatureInAtoms) {
    console.log('✅ PASS: Molecular signature column exists in atoms table');
    passed++;
  } else {
    console.log('❌ FAIL: Molecular signature column missing from atoms table');
    failed++;
  }

  // Summary
  console.log('\n\n=== TEST SUMMARY ===');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n❌ Migration tests did not pass completely');
    process.exit(1);
  } else {
    console.log('\n✅ All migration tests passed! Phase 3 is complete.');
    process.exit(0);
  }
}

runMigrationTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});