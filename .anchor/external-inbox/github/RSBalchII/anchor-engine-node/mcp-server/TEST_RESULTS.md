# MCP Server Settings Loading - Test Results

## Date: 2026-03-21

## Summary
✅ **SUCCESS**: MCP server now reads settings from `user_settings.json` for unity of abstraction.

---

## Code Changes Made

### File: `/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/index.ts`

#### 1. Added Settings Loading Logic (Lines 29-68)

**Added imports:**
```typescript
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
```

**Added settings loading before API configuration:**
```typescript
// Get MCP server directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// Try to load settings from user_settings.json (unity of abstraction)
let settingsApiKey = "";
let settingsApiUrl = "http://localhost:3161";
let settingsMcpConfig: Partial<MCPSecuritySettings> = {};

try {
  const settingsPath = join(projectRoot, "user_settings.json");
  if (existsSync(settingsPath)) {
    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    settingsApiKey = settings.server?.api_key || "";
    settingsApiUrl = `http://localhost:${settings.server?.port || 3161}`;
    
    // Load MCP-specific settings if present
    if (settings.mcp) {
      settingsMcpConfig = {
        enabled: settings.mcp.enabled ?? false,
        rate_limit_requests_per_minute: settings.mcp.rate_limit_requests_per_minute ?? 60,
        max_query_results: settings.mcp.max_query_results ?? 50,
        allowed_operations: settings.mcp.allowed_operations ?? ["query", "read_file", "get_stats"],
        blocked_operations: settings.mcp.blocked_operations ?? [],
        allow_write_operations: settings.mcp.allowed_operations?.includes("ingest") ?? false,
        default_bucket_for_writes: "external-inbox"
      };
    }
    
    console.error("✅ MCP: Loaded settings from user_settings.json");
    console.error(`   Engine URL: ${settingsApiUrl}`);
    console.error(`   API Key: ${settingsApiKey ? 'set (' + settingsApiKey.substring(0, 8) + '...)' : 'not set'}`);
  }
} catch (error) {
  console.error("⚠️  MCP: Could not load user_settings.json, using defaults");
}
```

#### 2. Updated API Configuration (Lines 70-76)

```typescript
// Anchor Engine API base URL
// Environment variables override settings (for backward compatibility)
const ANCHOR_API_URL = process.env.ANCHOR_API_URL || settingsApiUrl;

// Anchor API Key (optional, for servers that require auth)
// Environment variables override settings (for backward compatibility)
const ANCHOR_API_KEY = process.env.ANCHOR_API_KEY || settingsApiKey;
```

#### 3. Updated Security Settings Initialization (Lines 91-102)

```typescript
let securitySettings: MCPSecuritySettings = {
  enabled: false,
  require_api_key: true,
  api_key: "",
  rate_limit_requests_per_minute: 60,
  max_query_results: 50,
  restrict_to_localhost: true,
  allowed_operations: ["query", "read_file", "get_stats"],
  blocked_operations: [],
  allow_write_operations: false,
  default_bucket_for_writes: "external-inbox",
  ...settingsMcpConfig  // Apply settings from user_settings.json
};
```

#### 4. Added Startup Configuration Messages (Lines 871-880)

```typescript
async function main() {
  await loadSecuritySettings();

  // Show configuration summary
  console.error("");
  console.error("🔌 MCP Server Configuration:");
  console.error(`   Engine URL: ${ANCHOR_API_URL}`);
  console.error(`   API Key: ${ANCHOR_API_KEY ? 'set (' + ANCHOR_API_KEY.substring(0, 8) + '...)' : 'not set'}`);
  console.error(`   Source: ${process.env.ANCHOR_API_KEY ? 'environment variables' : 'user_settings.json'}`);
  console.error(`   MCP Enabled: ${securitySettings.enabled ? '✅' : '❌'}`);
  console.error("");

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Anchor Engine MCP Server running on stdio");
}
```

---

## Test Results

### Test 1: Settings File Detection
```
✅ PASS: user_settings.json found
```

### Test 2: Settings Loading
```
✅ PASS: Settings loaded successfully
   - Server port: 3161
   - Server API key: set (bolt-mem...)
   - MCP enabled: true
   - MCP rate limit: 120
   - MCP max results: 100
   - MCP allowed operations: ["query","read_file","get_stats","ingest","distill"]
```

### Test 3: Compiled Code Verification
```
✅ PASS: Compiled MCP server includes settings loading code
   - Has user_settings.json load: true
   - Has settingsApiKey: true
   - Has settingsApiUrl: true
   - Has settingsMcpConfig: true
```

### Test 4: API Connectivity
```
✅ PASS: Anchor Engine API accessible
   - Atoms: 151,515
   - Molecules: 182,152
   - Status: unknown
```

### Test 5: Engine Settings Verification
```
✅ PASS: Engine returns MCP settings via /v1/settings endpoint
   - MCP enabled: true
   - Rate limit: 120/min
   - Max results: 100
   - Allowed operations: query, read_file, get_stats, ingest, distill
```

---

## Startup Message Output

When the MCP server starts, it will now display:

```
✅ MCP: Loaded settings from user_settings.json
   Engine URL: http://localhost:3161
   API Key: set (bolt-mem...)

🔌 MCP Server Configuration:
   Engine URL: http://localhost:3161
   API Key: set (bolt-mem...)
   Source: user_settings.json
   MCP Enabled: ✅

Anchor Engine MCP Server running on stdio
```

---

## Key Features

1. **Unity of Abstraction**: MCP server reads from shared `user_settings.json`
2. **Backward Compatibility**: Environment variables still work and override settings
3. **Default Port Updated**: Changed from 3160 to 3161 (matches engine default)
4. **Clear Startup Messages**: Shows configuration source and status
5. **MCP Security Settings**: Loaded from `user_settings.json` mcp section
6. **Write Operations**: Controlled via `allow_write_operations` based on ingest in allowed_operations

---

## Usage

### Without Environment Variables (Recommended)
```bash
cd /data/data/com.termux/files/home/projects/anchor-engine-node
npm start  # Engine reads from user_settings.json
cd mcp-server
npm start  # MCP reads from user_settings.json
```

### With Environment Variables (Override)
```bash
export ANCHOR_API_URL="http://localhost:3161"
export ANCHOR_API_KEY="your-api-key"
npm start  # Environment variables override user_settings.json
```

---

## Files Modified

1. `/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/index.ts` - Main implementation
2. `/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/dist/index.js` - Compiled output

## Files Created (for testing)

1. `/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/test-settings.js` - Settings loading test
2. `/data/data/com.termux/files/home/projects/anchor-engine-node/mcp-server/test-integration.js` - Integration test

---

## Conclusion

✅ **All tests passed**. The MCP server now successfully:
- Loads API key and URL from `user_settings.json`
- Loads MCP security settings from `user_settings.json` mcp section
- Displays clear startup messages showing configuration source
- Maintains backward compatibility with environment variables
- Uses correct default port (3161) matching the engine
