# Configuration: Single Source of Truth

## Overview

This document establishes the **Single Source of Truth** pattern for Anchor Engine configuration. All configuration variables MUST be defined in `user_settings.json` and referenced from there.

## The Golden Rule

> **NEVER hardcode configuration values. ALWAYS use `user_settings.json`.**

## Configuration Hierarchy

```
user_settings.json (Single Source of Truth)
    ↓
engine/src/config/index.ts (Loads & validates)
    ↓
UI/API/Components (Reference config)
```

## Critical Configuration Values

### 1. API Key (MOST CRITICAL)

**Location in user_settings.json:**
```json
{
  "server": {
    "api_key": "anchor-engine-default-key"
  }
}
```

**Where it must match:**
- `user_settings.json` → `server.api_key`
- `packages/anchor-ui/src/utils/api-key-helper.ts` → `DEFAULT_API_KEY`
- `engine/src/config/index.ts` → `API_KEY` (loaded from user_settings)

**If these don't match:** 403 Forbidden errors on all API requests

### 2. Server Port

**Location in user_settings.json:**
```json
{
  "server": {
    "port": 3160
  }
}
```

**Where it's used:**
- Engine startup
- UI proxy configuration
- MCP server connection
- All API client connections

### 3. GitHub Token

**Location in user_settings.json:**
```json
{
  "github": {
    "token": "ghp_your_personal_access_token"
  }
}
```

**Note:** This is for persistent storage. UI can also send temporary tokens via `x-github-token` header.

### 4. Version

**Location in user_settings.json:**
```json
{
  "server": {
    "version": "4.8.2"
  }
}
```

**Where it's displayed:**
- Startup banner
- MCP server info
- System status API
- Health checks

## Files That MUST Reference user_settings.json

### Server-Side (Engine)
- `engine/src/config/index.ts` - Loads and exports all config
- `engine/src/index.ts` - Uses PORT, HOST, API_KEY
- `engine/src/mcp/server.ts` - Uses VERSION
- `engine/src/utils/startup-banner.ts` - Uses VERSION
- `engine/src/routes/v1/system.ts` - Uses VERSION

### Client-Side (UI)
- `packages/anchor-ui/src/utils/api-key-helper.ts` - DEFAULT_API_KEY must match
- `packages/anchor-ui/src/services/api.ts` - Uses getApiKey() helper

### Configuration Files
- `user_settings.json` - Your local configuration
- `user_settings.json.template` - Template with defaults

## Files That Should NOT Have Hardcoded Values

The following files had hardcoded values that have been moved to config:

- ❌ ~~`ingest-chats.js`~~ - Now reads from environment or uses default
- ❌ ~~`orchestrator.js`~~ - Now reads from orchestrator-config.json
- ❌ ~~`mcp-server/index.ts`~~ - Now reads from user_settings.json
- ❌ ~~`packages/anchor-ui/src/services/api.ts`~~ - Now uses getApiKey() helper

## Validation

Run the validation script to check for configuration mismatches:

```bash
node scripts/validate-config.js
```

This checks:
1. UI default API key matches user_settings.json template
2. No hardcoded values in source files
3. All required fields are present

## Adding New Configuration

When adding a new configuration value:

1. **Add to `user_settings.json.template`:**
   ```json
   {
     "new_section": {
       "new_value": "default"
     }
   }
   ```

2. **Add to `engine/src/config/index.ts`:**
   - Add to Config interface
   - Add to DEFAULT_CONFIG
   - Add loading logic from userSettings

3. **Update validation schema:**
   - Add Zod schema for validation

4. **Document in this file:**
   - Add section explaining the new configuration

5. **Update user_settings.json:**
   - Add the new section to your local config

## Common Pitfalls

### 1. API Key Mismatch
**Symptom:** 403 Forbidden on all API requests
**Cause:** UI has different default than server
**Fix:** Ensure both use `anchor-engine-default-key` or your custom key

### 2. Port Conflicts
**Symptom:** EADDRINUSE errors
**Cause:** Multiple services trying to use port 3160
**Fix:** Change `server.port` in user_settings.json

### 3. Missing GitHub Token
**Symptom:** 401 Unauthorized on GitHub ingestion
**Cause:** No PAT configured
**Fix:** Add `github.token` to user_settings.json or use UI field

### 4. Version Display Mismatch
**Symptom:** Different versions shown in different places
**Cause:** Hardcoded version strings
**Fix:** All version displays now use `config.VERSION`

## Migration Guide

### From Hardcoded to Config

If you find a hardcoded value:

1. Identify what it configures
2. Add to `user_settings.json.template` with appropriate default
3. Add to Config interface in `engine/src/config/index.ts`
4. Replace hardcoded value with `config.NEW_VALUE`
5. Update this documentation

### Example: Migrating a Hardcoded Port

**Before:**
```typescript
// In some-file.ts
const PORT = 3161; // Hardcoded!
```

**After:**
```typescript
// In user_settings.json
{
  "server": {
    "port": 3161
  }
}

// In engine/src/config/index.ts
interface Config {
  PORT: number;
}
const DEFAULT_CONFIG = {
  PORT: 3160, // Default
};
// Load from userSettings...

// In some-file.ts
import { config } from './config/index.js';
const PORT = config.PORT; // From config!
```

## Troubleshooting

### Check Current Configuration

```bash
# View server config
cat user_settings.json | jq '.server'

# View UI default
grep "DEFAULT_API_KEY" packages/anchor-ui/src/utils/api-key-helper.ts

# Test API key
curl -H "Authorization: Bearer $(jq -r '.server.api_key' user_settings.json)" \
     http://localhost:3160/health
```

### Reset to Defaults

```bash
# Backup current config
cp user_settings.json user_settings.json.backup

# Restore from template
cp user_settings.json.template user_settings.json

# Clear UI localStorage
# In browser console:
localStorage.removeItem('anchor_api_key');
location.reload();
```

## Related Documentation

- `docs/API.md` - API documentation
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/TROUBLESHOOTING.md` - Troubleshooting common issues
- `PAIN_POINTS_DOCUMENTATION.md` - Known configuration pain points

## Enforcement

This pattern is enforced by:
1. Code review - Check for hardcoded values
2. Validation script - Run `node scripts/validate-config.js`
3. Type checking - Config interface ensures all values are typed
4. Tests - Configuration tests verify loading and defaults

---

**Last Updated:** 2026-03-25
**Version:** 4.8.2
**Status:** Active
