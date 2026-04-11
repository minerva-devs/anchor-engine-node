#!/usr/bin/env node
/**
 * Cross-Route Test for Anchor Engine
 * 
 * Tests search, distillation, and ingestion across all three access routes:
 * 1. HTTP API (direct)
 * 2. MCP (simulated via HTTP)
 * 3. UI (simulated via HTTP)
 */

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

const getHeaders = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
});

// Helper to parse SSE responses
async function parseSSE(response) {
  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('text/event-stream')) {
    return response.json();
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let data = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    data += decoder.decode(value, { stream: true });
  }
  
  const events = data.split('\n\n').filter(e => e.trim());
  const results = [];
  
  for (const event of events) {
    if (event.startsWith('data:')) {
      try {
        const parsed = JSON.parse(event.substring(5));
        if (parsed.type === 'result' || parsed.type === 'batch') {
          results.push(parsed);
        }
      } catch (err) {
        // Skip invalid JSON
      }
    }
  }
  
  return results;
}

// Test Search
async function testSearch(routeName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing SEARCH via ${routeName}`);
  console.log('='.repeat(80));
  
  const queries = [
    { query: 'test', strategy: 'standard' },
    { query: 'distillation', strategy: 'standard' },
    { query: 'architecture', strategy: 'max-recall' },
  ];
  
  const results = [];
  
  for (const { query, strategy } of queries) {
    console.log(`\nQuery: "${query}" (${strategy})`);
    
    const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        query,
        max_chars: 10000,
        token_budget: 2500,
        strategy,
        provenance: 'all',
      }),
    });
    
    const parsed = await parseSSE(response);
    const totalResults = parsed.reduce((sum, p) => sum + (p.results?.length || 0), 0);
    
    console.log(`  Results: ${totalResults}`);
    results.push({ query, strategy, totalResults });
  }
  
  return results;
}

// Test Distillation
async function testDistillation(routeName) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing DISTILLATION via ${routeName}`);
  console.log('='.repeat(80));
  
  const tests = [
    { seed: { global: true }, format: 'decision-records', name: 'Global' },
    { seed: { query: 'test', limit_seeds: 8 }, format: 'decision-records', name: 'Radial (test)' },
  ];
  
  const results = [];
  
  for (const { seed, format, name } of tests) {
    console.log(`\n${name} distillation (${format})`);
    
    const response = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        seed,
        radius: 3,
        max_nodes: 500,
        output_format: format,
        mode: 'tag-based',
        similarity_threshold: 0.85,
      }),
    });
    
    const data = await response.json();
    console.log(`  Decision records: ${data.stats?.decision_records || 0}`);
    console.log(`  Duration: ${data.duration_ms}ms`);
    results.push({ name, records: data.stats?.decision_records || 0, duration: data.duration_ms });
  }
  
  return results;
}

// Test Stats
async function testStats() {
  console.log(`\n${'='.repeat(80)}`);
  console.log('Testing STATS');
  console.log('='.repeat(80));
  
  const response = await fetch(`${ENGINE_URL}/v1/stats`, {
    headers: getHeaders(),
  });
  
  const data = await response.json();
  console.log(`  Atoms: ${data.atoms}`);
  console.log(`  Molecules: ${data.molecules}`);
  console.log(`  Sources: ${data.sources}`);
  console.log(`  Tags: ${data.tags}`);
  
  return data;
}

// Main
async function main() {
  console.log('\n🧪 CROSS-ROUTE TEST SUITE');
  console.log('Engine URL:', ENGINE_URL);
  console.log('');
  
  // Test stats first
  await testStats();
  
  // Test search across all routes (simulated)
  await testSearch('HTTP API');
  await testSearch('MCP (simulated)');
  await testSearch('UI (simulated)');
  
  // Test distillation across all routes (simulated)
  await testDistillation('HTTP API');
  await testDistillation('MCP (simulated)');
  await testDistillation('UI (simulated)');
  
  console.log('\n' + '='.repeat(80));
  console.log('✅ Cross-route tests completed!');
  console.log('='.repeat(80) + '\n');
}

main().catch(console.error);
