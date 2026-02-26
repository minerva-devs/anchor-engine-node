/**
 * Radial Inflation and FFI Fix Verification Test
 */

import { AnchorCore } from '../../engine/src/native/index.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, 'test_radial.db');

function cleanup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
}

async function runTest() {
  console.log('🧪 Radial Inflation Test\n');

  const core = new AnchorCore();

  try {
    cleanup();

    console.log('📦 Initializing database...');
    core.init(TEST_DB_PATH);

    // --- Test 1: Verify Static Initialization Bug Fix ---
    console.log('\n1. Verifying search bug fix...');

    // Insert some unique content
    console.log('   Upserting sources...');
    core.upsertSource("src1", "/path/to/src1", 1000);
    core.upsertSource("src2", "/path/to/src2", 1001);

    const id1 = core.insertAtom("src1", "Apple pie recipe", 0, 10, 1000, 12345n);
    const id2 = core.insertAtom("src2", "Banana bread recipe", 0, 10, 1001, 67890n);

    console.log('   Inserted atoms:', id1, id2);

    const res1 = core.search("Apple", 10);
    console.log(`   Search 'Apple': found ${res1.length} results`);
    if (res1.length !== 1 || !res1[0].content.includes("Apple")) {
        throw new Error("First search failed or incorrect");
    }

    const res2 = core.search("Banana", 10);
    console.log(`   Search 'Banana': found ${res2.length} results`);

    // If bug exists, res2 will be same as res1 (Apple)
    if (res2.length !== 1 || !res2[0].content.includes("Banana")) {
        console.error("   DEBUG: res2 content:", res2.length > 0 ? res2[0].content : "empty");
        throw new Error("Static initialization bug detected! Subsequent searches are returning stale data.");
    }

    console.log('   ✅ Search bug is FIXED (results update correctly)');

    // --- Test 2: Radial Inflation ---
    console.log('\n2. Testing Radial Inflation...');

    // Atom 1 and 2 share "recipe" tag?
    // Let's add explicit tags using our new FFI function
    console.log('   Adding tags...');
    core.addTag(id1, "cooking");
    core.addTag(id2, "cooking");
    core.addTag(id1, "fruit");
    core.addTag(id2, "fruit");

    // Now perform radial inflation from id1
    // Should find id2 because they share tags
    console.log(`   Performing radial inflation from atom ${id1}...`);

    const candidates = core.radialInflation([id1], 10, 0.001);
    console.log(`   Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
        throw new Error("Radial inflation returned no results (expected at least 1)");
    }

    const foundId2 = candidates.find(c => c.atom_id === id2);
    if (!foundId2) {
        console.log("   Candidates:", JSON.stringify(candidates, null, 2));
        throw new Error(`Radial inflation did not find atom ${id2}`);
    }

    console.log(`   ✅ Found connected atom ${id2} with score ${foundId2.gravity_score}`);
    console.log('   ✅ Radial Inflation works!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    console.log('\n🧹 Cleaning up...');
    core.destroy();
    cleanup();
  }
}

runTest().catch(console.error);
