#!/usr/bin/env node
/**
 * Test ingestion with watchdog trigger
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

async function triggerWatchdog() {
  console.log('\nTriggering watchdog ingestion...');
  const response = await fetch(`${ENGINE_URL}/v1/watchdog/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Watchdog result:', data);
  } else {
    const error = await response.text();
    console.log('Error:', error);
  }
}

async function testStats() {
  console.log('\nChecking stats...');
  const response = await fetch(`${ENGINE_URL}/v1/stats`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  console.log('Status:', response.status);
  if (response.ok) {
    const data = await response.json();
    console.log('Stats:', JSON.stringify(data, null, 2));
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

async function main() {
  await ingestText();
  console.log('\nWaiting 10 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  await triggerWatchdog();
  console.log('\nWaiting 10 seconds for processing...');
  await new Promise(resolve => setTimeout(resolve, 10000));
  await testStats();
  await testSearch();
}

main().catch(console.error);
