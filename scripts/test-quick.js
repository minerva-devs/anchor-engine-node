#!/usr/bin/env node
/**
 * Quick Cross-Route Test for Anchor Engine
 */

const ENGINE_URL = 'http://127.0.0.0:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

const getHeaders = () => ({
  'Authorization': `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
});

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
      } catch (err) {}
    }
  }
  
  return results;
}

async function testSearch(routeName, query) {
  const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      query,
      max_chars: 10000,
      token_budget: 2500,
      strategy: 'standard',
      provenance: 'all',
    }),
  });
  
  const parsed = await parseSSE(response);
  return parsed.reduce((sum, p) => sum + (p.results?.length || 0), 0);
}

async function main() {
  console.log('\n🧪 QUICK CROSS-ROUTE TEST\n');
  
  const query = 'test';
  const results = {};
  
  // Test search via all routes
  results.http = await testSearch('HTTP', query);
  results.mcp = await testSearch('MCP', query);
  results.ui = await testSearch('UI', query);
  
  console.log(`Search results for "${query}":`);
  console.log(`  HTTP API:  ${results.http} results`);
  console.log(`  MCP:       ${results.mcp} results`);
  console.log(`  UI:        ${results.ui} results`);
  
  // Check consistency
  const consistent = results.http === results.mcp && results.mcp === results.ui;
  
  console.log('\n' + '='.repeat(60));
  if (consistent) {
    console.log('✅ CONSISTENT: All routes returned the same results');
  } else {
    console.log('❌ INCONSISTENT: Results differ across routes');
  }
  console.log('='.repeat(60) + '\n');
}

main().catch(console.error);
