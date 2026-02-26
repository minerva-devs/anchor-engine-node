import { AnchorCore } from '../../engine/src/native/index.js';
import { existsSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_DB_PATH = join(__dirname, 'test_optimization.db');

function cleanup() {
  if (existsSync(TEST_DB_PATH)) {
    rmSync(TEST_DB_PATH);
  }
}

async function runTest() {
  console.log('🧪 Verifying Optimization (Batch Loading)...');

  const core = new AnchorCore();
  cleanup();

  try {
    core.init(TEST_DB_PATH);

    // Upsert source
    core.upsertSource('src1', '/path/to/src1');

    // Create atoms
    // Atom 1: Anchor
    const id1 = core.insertAtom('src1', 'Anchor Content', 0, 10, 1000.0, 123456n);
    // Atom 2: Neighbor
    const id2 = core.insertAtom('src1', 'Neighbor Content', 10, 20, 1001.0, 654321n);

    console.log(`Created atoms: ${id1}, ${id2}`);

    // Create edge
    core.insertEdge(id1, id2, 0.5, 'tag');
    console.log('Created edge');

    // Perform radial inflation from id1
    // Should find id2
    const results = core.radialInflation([id1], 10, 0.0); // 0.0 threshold to include everything

    console.log(`Radial inflation results: ${JSON.stringify(results)}`);

    if (results.length > 0 && results[0].atom_id === id2) {
      console.log('✅ Found neighbor atom correctly.');
      if (results[0].timestamp === 1001.0 && results[0].simhash === 654321) {
         console.log('✅ Timestamp and SimHash loaded correctly.');
      } else {
         console.error('❌ Metadata mismatch.');
         console.error(`Expected timestamp 1001.0, got ${results[0].timestamp}`);
         console.error(`Expected simhash 654321, got ${results[0].simhash}`);
         process.exit(1);
      }
    } else {
      console.error('❌ Failed to find neighbor atom.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    core.destroy();
    cleanup();
  }
}

runTest();
