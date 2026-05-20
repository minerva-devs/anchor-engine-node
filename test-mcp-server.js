const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testMCP() {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['C:/Users/rsbii/Projects/anchor-engine-node/engine/src/mcp/server.ts'],
  });

  const client = new Client(
    {
      name: 'test-client',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  await client.connect(transport);
  console.log('Connected to MCP server');

  // Test 1: List tools
  const tools = await client.listTools();
  console.log('\n=== Available Tools ===');
  tools.tools.forEach(t => console.log(`- ${t.name}: ${t.description}`));

  // Test 2: anchor_start
  console.log('\n=== Testing anchor_start ===');
  try {
    const startResult = await client.callTool({
      name: 'anchor_start',
      arguments: {},
    });
    console.log('anchor_start result:', JSON.stringify(startResult, null, 2));
  } catch (e) {
    console.log('anchor_start error:', e.message);
  }

  // Test 3: anchor_status
  console.log('\n=== Testing anchor_status ===');
  try {
    const status = await client.callTool({
      name: 'anchor_status',
      arguments: {},
    });
    console.log('anchor_status result:', JSON.stringify(status, null, 2));
  } catch (e) {
    console.log('anchor_status error:', e.message);
  }

  // Test 4: anchor_health
  console.log('\n=== Testing anchor_health ===');
  try {
    const health = await client.callTool({
      name: 'anchor_health',
      arguments: {},
    });
    console.log('anchor_health result:', JSON.stringify(health, null, 2));
  } catch (e) {
    console.log('anchor_health error:', e.message);
  }

  // Test 5: anchor_list_paths
  console.log('\n=== Testing anchor_list_paths ===');
  try {
    const paths = await client.callTool({
      name: 'anchor_list_paths',
      arguments: {},
    });
    console.log('anchor_list_paths result:', JSON.stringify(paths, null, 2));
  } catch (e) {
    console.log('anchor_list_paths error:', e.message);
  }

  // Test 6: anchor_set_path
  console.log('\n=== Testing anchor_set_path ===');
  try {
    const setPath = await client.callTool({
      name: 'anchor_set_path',
      arguments: { path: 'C:/Users/rsbii/Projects/anchor-engine-node' },
    });
    console.log('anchor_set_path result:', JSON.stringify(setPath, null, 2));
  } catch (e) {
    console.log('anchor_set_path error:', e.message);
  }

  // Test 7: anchor_search
  console.log('\n=== Testing anchor_search ===');
  try {
    const search = await client.callTool({
      name: 'anchor_search',
      arguments: { query: 'test' },
    });
    console.log('anchor_search result:', JSON.stringify(search, null, 2));
  } catch (e) {
    console.log('anchor_search error:', e.message);
  }

  // Test 8: anchor_distill
  console.log('\n=== Testing anchor_distill ===');
  try {
    const distill = await client.callTool({
      name: 'anchor_distill',
      arguments: {},
    });
    console.log('anchor_distill result:', JSON.stringify(distill, null, 2));
  } catch (e) {
    console.log('anchor_distill error:', e.message);
  }

  // Test 9: anchor_illuminate
  console.log('\n=== Testing anchor_illuminate ===');
  try {
    const illuminate = await client.callTool({
      name: 'anchor_illuminate',
      arguments: { seed: 'test' },
    });
    console.log('anchor_illuminate result:', JSON.stringify(illuminate, null, 2));
  } catch (e) {
    console.log('anchor_illuminate error:', e.message);
  }

  // Test 10: anchor_ingest
  console.log('\n=== Testing anchor_ingest ===');
  try {
    const ingest = await client.callTool({
      name: 'anchor_ingest',
      arguments: { content: 'Hello World', source: 'test', type: 'text' },
    });
    console.log('anchor_ingest result:', JSON.stringify(ingest, null, 2));
  } catch (e) {
    console.log('anchor_ingest error:', e.message);
  }

  // Test 11: anchor_ingest_status
  console.log('\n=== Testing anchor_ingest_status ===');
  try {
    const ingestStatus = await client.callTool({
      name: 'anchor_ingest_status',
      arguments: {},
    });
    console.log('anchor_ingest_status result:', JSON.stringify(ingestStatus, null, 2));
  } catch (e) {
    console.log('anchor_ingest_status error:', e.message);
  }

  // Test 12: anchor_delete_path
  console.log('\n=== Testing anchor_delete_path ===');
  try {
    const deletePath = await client.callTool({
      name: 'anchor_delete_path',
      arguments: { path: 'C:/Users/rsbii/Projects/anchor-engine-node' },
    });
    console.log('anchor_delete_path result:', JSON.stringify(deletePath, null, 2));
  } catch (e) {
    console.log('anchor_delete_path error:', e.message);
  }

  // Test 13: anchor_stop
  console.log('\n=== Testing anchor_stop ===');
  try {
    const stop = await client.callTool({
      name: 'anchor_stop',
      arguments: {},
    });
    console.log('anchor_stop result:', JSON.stringify(stop, null, 2));
  } catch (e) {
    console.log('anchor_stop error:', e.message);
  }

  await client.disconnect();
  console.log('\nDisconnected from MCP server');
}

testMCP().catch(console.error);