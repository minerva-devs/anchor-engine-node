/**
 * SimHash Test
 */

import { AnchorCore } from '../../engine/src/native/index.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runTest() {
  console.log('🧪 SimHash Test\n');

  const core = new AnchorCore();

  try {
    core.init(':memory:');

    const text1 = "the quick brown fox jumps over the lazy dog";
    const text2 = "the quick brown fox jumps over the lazy dog"; // Identical
    const text3 = "the quick brown fox jumps over the lazy cat"; // Very similar
    const text4 = "lorem ipsum dolor sit amet"; // Very different

    const hash1 = core.computeSimHash(text1);
    const hash2 = core.computeSimHash(text2);
    const hash3 = core.computeSimHash(text3);
    const hash4 = core.computeSimHash(text4);

    console.log(`Text 1: "${text1}" -> ${hash1.toString(16)}`);
    console.log(`Text 2: "${text2}" -> ${hash2.toString(16)}`);
    console.log(`Text 3: "${text3}" -> ${hash3.toString(16)}`);
    console.log(`Text 4: "${text4}" -> ${hash4.toString(16)}`);

    // Helper to count bits (Hamming distance)
    function hamming(h1, h2) {
      let x = h1 ^ h2;
      let count = 0;
      while (x > 0n) {
        if (x & 1n) count++;
        x >>= 1n;
      }
      return count;
    }

    const dist12 = hamming(hash1, hash2);
    const dist13 = hamming(hash1, hash3);
    const dist14 = hamming(hash1, hash4);

    console.log(`\nDistance 1-2 (Identical): ${dist12}`);
    console.log(`Distance 1-3 (Similar):   ${dist13}`);
    console.log(`Distance 1-4 (Different): ${dist14}`);

    if (dist12 !== 0) throw new Error('Identical texts should have 0 distance');
    if (dist13 > 15) throw new Error('Similar texts should have small distance');
    if (dist14 < 15) throw new Error('Different texts should have large distance');

    console.log('\n✅ SimHash works correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    core.destroy();
  }
}

runTest();
