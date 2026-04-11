#!/usr/bin/env node
/**
 * Test search with various queries
 */

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

async function testSearch(query) {
  console.log(`\nSearching for "${query}"...`);
  const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_chars: 10000,
      token_budget: 2500,
      strategy: 'standard',
      provenance: 'all',
    }),
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let data = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        data += decoder.decode(value, { stream: true });
      }
      
      const events = data.split('\n\n').filter(e => e.trim());
      const results = events
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.substring(5)))
        .filter(e => e.type === 'result');
      
      console.log('Results found:', results.length);
      if (results.length > 0) {
        console.log('Sample result:', JSON.stringify(results[0], null, 2));
      }
    } else {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function main() {
  await testSearch('test');
  await testSearch('decision');
  await testSearch('record');
  await testSearch('architecture');
  await testSearch('database');
  await testSearch('search');
}

main().catch(console.error);
