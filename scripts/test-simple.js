#!/usr/bin/env node
/**
 * Test with existing data - ingest a simple file
 */

const ENGINE_URL = 'http://localhost:3160';
const API_KEY = '2bec68510a2da3dcfc9c3ff03a4abb5ca9c72f573af0a9602d4c92e031ba0263';

async function ingestText() {
  console.log('Ingesting test text...');
  const response = await fetch(`${ENGINE_URL}/v1/research/upload-raw`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: 'This is a test document about decision records. Decision records are a format for documenting architectural decisions. They include fields like title, date, decision, context, and rationale.',
      filename: 'test-decision-record.md',
      bucket: 'inbox',
      tags: ['test', 'decision-record'],
    }),
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Ingestion result:', data);
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function testSearch() {
  console.log('\nSearching for "decision record"...');
  const response = await fetch(`${ENGINE_URL}/v1/memory/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: 'decision record',
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
      results.forEach((r, i) => {
        console.log(`\nResult ${i + 1}:`, r);
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

async function testDistill() {
  console.log('\nRunning distillation...');
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
    console.log('Distillation result:', JSON.stringify(data, null, 2));
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function main() {
  await ingestText();
  console.log('\nWaiting 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  await testSearch();
  await testDistill();
}

main().catch(console.error);
