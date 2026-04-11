#!/usr/bin/env node
/**
 * Test search with different parameters
 */

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

async function testSearch(query, options = {}) {
  console.log(`\nSearching for "${query}"...`);
  
  const body = {
    query,
    max_chars: options.max_chars || 10000,
    token_budget: options.token_budget || 2500,
    strategy: options.strategy || 'standard',
    provenance: options.provenance || 'all',
    ...options,
  };
  
  console.log('Body:', JSON.stringify(body, null, 2));
  
  const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  if (response.ok) {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      console.log('Streaming response...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let data = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        data += decoder.decode(value, { stream: true });
      }
      
      console.log('Raw data:', data.substring(0, 1000));
      
      const events = data.split('\n\n').filter(e => e.trim());
      console.log('Events:', events.length);
      events.forEach((e, i) => {
        if (e.startsWith('data:')) {
          try {
            const parsed = JSON.parse(e.substring(5));
            console.log(`Event ${i}:`, parsed.type, parsed);
          } catch (err) {
            console.log(`Event ${i}:`, e.substring(0, 200));
          }
        }
      });
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
  await testSearch('test', { max_chars: 50000, token_budget: 10000 });
  await testSearch('test', { strategy: 'max-recall' });
  await testSearch('test', { buckets: ['inbox'] });
}

main().catch(console.error);
