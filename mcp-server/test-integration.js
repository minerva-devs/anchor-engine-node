#!/usr/bin/env node
/**
 * Integration test: Verify MCP server can load settings and execute a query
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('🧪 MCP Server Integration Test\n');
console.log('=' .repeat(50));

// Load settings from user_settings.json
const settingsPath = join(projectRoot, 'user_settings.json');
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

const ANCHOR_API_URL = `http://localhost:${settings.server?.port || 3161}`;
const ANCHOR_API_KEY = settings.server?.api_key || '';

console.log('\n📋 Configuration:');
console.log(`   Engine URL: ${ANCHOR_API_URL}`);
console.log(`   API Key: ${ANCHOR_API_KEY ? 'set (' + ANCHOR_API_KEY.substring(0, 8) + '...)' : 'not set'}`);
console.log('   Source: user_settings.json');

// Test 1: Get stats
console.log('\n\n📊 Test 1: Get Engine Stats');
console.log('-'.repeat(50));
try {
  const statsResponse = await fetch(`${ANCHOR_API_URL}/v1/stats`, {
    headers: {
      'Authorization': ANCHOR_API_KEY ? `Bearer ${ANCHOR_API_KEY}` : '',
    },
  });
  
  if (statsResponse.ok) {
    const stats = await statsResponse.json();
    console.log('✅ SUCCESS');
    console.log(`   Atoms: ${stats.atoms?.toLocaleString() || 0}`);
    console.log(`   Molecules: ${stats.molecules?.toLocaleString() || 0}`);
    console.log(`   Compounds: ${stats.compounds?.toLocaleString() || 0}`);
  } else {
    const error = await statsResponse.text();
    console.log(`❌ FAILED: ${statsResponse.status} - ${error}`);
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}`);
}

// Test 2: Execute a search query
console.log('\n\n🔍 Test 2: Execute Search Query');
console.log('-'.repeat(50));
try {
  const searchResponse = await fetch(`${ANCHOR_API_URL}/v1/memory/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': ANCHOR_API_KEY ? `Bearer ${ANCHOR_API_KEY}` : '',
    },
    body: JSON.stringify({
      query: 'MCP server configuration',
      max_chars: 1000,
      token_budget: 200,
      buckets: [],
      strategy: 'standard',
      provenance: 'all',
    }),
  });
  
  if (searchResponse.ok) {
    const results = await searchResponse.json();
    const batches = results.filter(e => e.type === 'batch');
    const allResults = batches.flatMap(b => b.results || []);
    
    console.log('✅ SUCCESS');
    console.log(`   Found ${allResults.length} results`);
    
    if (allResults.length > 0) {
      console.log('\n   Top result:');
      const top = allResults[0];
      console.log(`   Score: ${(top.score || 0).toFixed(3)}`);
      console.log(`   Source: ${top.source || 'unknown'}`);
      console.log(`   Content: ${top.content?.substring(0, 150) || '[no content]'}...`);
    }
  } else {
    const error = await searchResponse.text();
    console.log(`❌ FAILED: ${searchResponse.status} - ${error}`);
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}`);
}

// Test 3: List compounds
console.log('\n\n📚 Test 3: List Compounds');
console.log('-'.repeat(50));
try {
  const compoundsResponse = await fetch(`${ANCHOR_API_URL}/v1/compounds/list`, {
    headers: {
      'Authorization': ANCHOR_API_KEY ? `Bearer ${ANCHOR_API_KEY}` : '',
    },
  });
  
  if (compoundsResponse.ok) {
    const result = await compoundsResponse.json();
    const compounds = result.compounds || [];
    console.log('✅ SUCCESS');
    console.log(`   Total compounds: ${compounds.length}`);
    
    if (compounds.length > 0) {
      console.log('\n   First 5 compounds:');
      compounds.slice(0, 5).forEach(c => {
        console.log(`   - ${c.name} (${c.molecule_count || 0} molecules)`);
      });
    }
  } else {
    const error = await compoundsResponse.text();
    console.log(`❌ FAILED: ${compoundsResponse.status} - ${error}`);
  }
} catch (error) {
  console.log(`❌ FAILED: ${error.message}`);
}

console.log('\n' + '='.repeat(50));
console.log('✅ Integration test completed!\n');
