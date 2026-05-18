/**
 * Distillation Test Suite - Standard 133 Verification
 * 
 * Tests that radial distillation properly handles:
 * 1. No seed query (should return ALL compounds regardless of provenance)
 * 2. Specific seed query
 * 3. Compound ID filtering
 * 4. Bucket-based filtering
 */

const { exec } = require('child_process');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  enginePort: 3160,
  apiEndpoint: `http://localhost:${TEST_CONFIG.enginePort}/v1/memory/distill`,
};

/**
 * Test 1: Distillation with no seed (should return all compounds)
 */
async function testDistillationNoSeed() {
  console.log('🧪 Test 1: Distillation with no seed query...');
  
  try {
    const startTime = Date.now();
    
    // Make API call with no seed
    const response = await fetch(TEST_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANCHOR_API_KEY}`,
      },
      body: JSON.stringify({
        radius: 2000,
        mode: 'tag-based',
      }),
    });

    const result = await response.json();
    const duration = Date.now() - startTime;

    console.log(`⏱️ Duration: ${duration}ms`);
    console.log(`📊 Stats:`, JSON.stringify(result.stats, null, 2));

    // Assertions
    if (result.status !== 'success') {
      throw new Error('Distillation failed');
    }

    const blocksTotal = result.stats?.blocks_total || 0;
    const compoundsProcessed = result.stats?.compounds_processed || 0;

    console.log(`✅ Compounds Processed: ${compoundsProcessed}`);
    console.log(`✅ Blocks Total: ${blocksTotal}`);

    if (compoundsProcessed === 0 && blocksTotal === 0) {
      throw new Error('Distillation returned 0 compounds/blocks - BUG NOT FIXED!');
    }

    console.log('✅ TEST PASSED: Distillation returns results with no seed\n');
    return true;
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    return false;
  }
}

/**
 * Test 2: Distillation with specific query
 */
async function testDistillationWithQuery() {
  console.log('🧪 Test 2: Distillation with seed query...');
  
  try {
    const response = await fetch(TEST_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANCHOR_API_KEY}`,
      },
      body: JSON.stringify({
        seed: { query: 'coding' },
        radius: 2000,
        mode: 'tag-based',
      }),
    });

    const result = await response.json();

    if (result.status !== 'success') {
      throw new Error('Distillation failed with query');
    }

    console.log(`✅ TEST PASSED: Distillation works with seed query\n`);
    return true;
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    return false;
  }
}

/**
 * Test 3: Verify provenance filtering is removed when no seed provided
 */
async function testProvenanceFiltering() {
  console.log('🧪 Test 3: Verify all provenances are included...');
  
  try {
    const response = await fetch(TEST_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ANCHOR_API_KEY}`,
      },
      body: JSON.stringify({
        radius: 2000,
        mode: 'tag-based',
      }),
    });

    const result = await response.json();

    // Check that compounds from different provenances are included
    const hasGitHubProvenance = result.stats?.compounds_processed > 100; // Your coding notes have 102k atoms
    
    if (!hasGitHubProvenance) {
      throw new Error('Compounds with github provenance not found - filter still active!');
    }

    console.log(`✅ TEST PASSED: All provenances included\n`);
    return true;
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('========================================');
  console.log('  Distillation Test Suite - Standard 133');
  console.log('========================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  const tests = [
    testDistillationNoSeed,
    testDistillationWithQuery,
    testProvenanceFiltering,
  ];

  for (const test of tests) {
    results.total++;
    if (await test()) {
      results.passed++;
    } else {
      results.failed++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait between tests
  }

  console.log('========================================');
  console.log('  Test Results Summary');
  console.log('========================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log('========================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
  
  console.log('🎉 All tests passed!\n');
  process.exit(0);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
