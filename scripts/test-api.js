#!/usr/bin/env node
/**
 * Simple API test script
 */

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

async function testHealth() {
  console.log('Testing /health endpoint...');
  const response = await fetch(`${ENGINE_URL}/health`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Response:', data);
}

async function testSearch() {
  console.log('\nTesting /v1/memory/search endpoint...');
  const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'test',
      max_chars: 10000,
      token_budget: 2500,
      strategy: 'standard',
      provenance: 'all',
    }),
  });
  console.log('Status:', response.status);
  if (response.ok) {
    // Check if it's SSE stream
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    if (contentType?.includes('text/event-stream')) {
      console.log('Streaming response detected. Reading SSE...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let data = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        data += decoder.decode(value, { stream: true });
      }
      
      console.log('Raw response:', data.substring(0, 500));
      
      // Parse SSE events
      const events = data.split('\n\n').filter(e => e.trim());
      const results = events
        .filter(e => e.startsWith('data:'))
        .map(e => JSON.parse(e.substring(5)))
        .filter(e => e.type !== 'batch');
      
      console.log('Parsed results:', JSON.stringify(results, null, 2));
    } else {
      const data = await response.json();
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function testDistill() {
  console.log('\nTesting /v1/memory/distill endpoint...');
  const response = await fetch(`${ENGINE_URL}/v1/memory/distill`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      seed: { global: true },
      radius: 3,
      max_nodes: 500,
      output_format: 'decision-records',
      mode: 'tag-based',
      similarity_threshold: 0.85,
    }),
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function main() {
  await testHealth();
  await testSearch();
  await testDistill();
}

main().catch(console.error);
