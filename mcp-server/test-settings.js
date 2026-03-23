#!/usr/bin/env node
/**
 * Test script to verify MCP server loads settings from user_settings.json
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing MCP Server Settings Loading\n');

// Test 1: Check user_settings.json exists
const settingsPath = join(projectRoot, 'user_settings.json');
console.log('Test 1: user_settings.json exists');
if (existsSync(settingsPath)) {
  console.log('✅ PASS: user_settings.json found\n');
} else {
  console.log('❌ FAIL: user_settings.json not found\n');
  process.exit(1);
}

// Test 2: Load and parse settings
console.log('Test 2: Load settings from user_settings.json');
try {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
  console.log('✅ PASS: Settings loaded successfully');
  console.log(`   - Server port: ${settings.server?.port || 'not set'}`);
  console.log(`   - Server API key: ${settings.server?.api_key ? 'set (' + settings.server.api_key.substring(0, 8) + '...)' : 'not set'}`);
  console.log(`   - MCP enabled: ${settings.mcp?.enabled ?? 'not set'}`);
  console.log(`   - MCP rate limit: ${settings.mcp?.rate_limit_requests_per_minute ?? 'not set'}`);
  console.log(`   - MCP max results: ${settings.mcp?.max_query_results ?? 'not set'}`);
  console.log(`   - MCP allowed operations: ${JSON.stringify(settings.mcp?.allowed_operations ?? [])}\n`);
} catch (error) {
  console.log('❌ FAIL: Could not parse settings');
  console.log(`   Error: ${error.message}\n`);
  process.exit(1);
}

// Test 3: Verify compiled MCP server has settings loading code
console.log('Test 3: Verify compiled MCP server includes settings loading');
const mcpDistPath = join(__dirname, 'dist/index.js');
if (existsSync(mcpDistPath)) {
  const mcpCode = readFileSync(mcpDistPath, 'utf8');
  const hasSettingsLoad = mcpCode.includes('user_settings.json');
  const hasSettingsApiKey = mcpCode.includes('settingsApiKey');
  const hasSettingsApiUrl = mcpCode.includes('settingsApiUrl');
  const hasMcpConfig = mcpCode.includes('settingsMcpConfig');
  
  if (hasSettingsLoad && hasSettingsApiKey && hasSettingsApiUrl && hasMcpConfig) {
    console.log('✅ PASS: Compiled MCP server includes settings loading code\n');
  } else {
    console.log('❌ FAIL: Compiled MCP server missing settings loading code');
    console.log(`   - Has user_settings.json load: ${hasSettingsLoad}`);
    console.log(`   - Has settingsApiKey: ${hasSettingsApiKey}`);
    console.log(`   - Has settingsApiUrl: ${hasSettingsApiUrl}`);
    console.log(`   - Has settingsMcpConfig: ${hasMcpConfig}\n`);
    process.exit(1);
  }
} else {
  console.log("❌ FAIL: dist/index.js not found. Run 'npm run build' first.\n");
  process.exit(1);
}

// Test 4: Test API connectivity with loaded settings
console.log('Test 4: Test Anchor Engine API connectivity');
const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));
const apiUrl = `http://localhost:${settings.server?.port || 3161}`;
const apiKey = settings.server?.api_key || '';

try {
  const response = await fetch(`${apiUrl}/v1/stats`, {
    headers: {
      'Authorization': apiKey ? `Bearer ${apiKey}` : '',
    },
  });
  
  if (response.ok) {
    const stats = await response.json();
    console.log('✅ PASS: Anchor Engine API accessible');
    console.log(`   - Atoms: ${stats.atoms?.toLocaleString() || 0}`);
    console.log(`   - Molecules: ${stats.molecules?.toLocaleString() || 0}`);
    console.log(`   - Status: ${stats.status || 'unknown'}\n`);
  } else if (response.status === 401) {
    console.log('⚠️  WARNING: API requires authentication');
    console.log('   This is expected if API key is not set or incorrect\n');
  } else {
    console.log(`❌ FAIL: API returned error ${response.status}\n`);
  }
} catch (error) {
  console.log(`❌ FAIL: Could not connect to Anchor Engine at ${apiUrl}`);
  console.log(`   Error: ${error.message}`);
  console.log('   Make sure the Anchor Engine is running: npm start\n');
}

console.log('✅ All tests completed!');
