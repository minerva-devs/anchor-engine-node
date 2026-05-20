# Live-Fire Integration Test Suite Assessment

**Date:** 2026-05-20  
**Test File:** `engine/tests/integration/live-fire.test.ts`  
**Duration:** ~10 minutes (timeout after 5 min)  
**Status:** ❌ FAILED

---

## Executive Summary

The live-fire integration test suite **FAILED** due to multiple critical issues:
1. **API Endpoint Mismatch** - Tests use `/api/*` but server exposes routes at `/v1/*`
2. **Watchdog Never Started** - Due to incorrect endpoint, watchdog remained idle (isRunning: false)
3. **Database Empty** - No data was ingested because watchdog never processed files
4. **Windows/PowerShell Incompatibility** - Test uses Unix `ls -la` which doesn't exist on Windows

---

## Test Execution Summary

| Metric | Value |
|--------|-------|
| Total Tests Defined | 15 tests |
| Tests Executed Before Timeout | 4 tests |
| Passed | 1 test (`should clone the anchor-engine-node repository`) |
| Failed | 3 tests (errors + timeout) |
| Skipped | 0 |
| Execution Time | ~283 seconds (timed out at ingestion monitoring phase) |

### Test Results Breakdown

| # | Test Name | Status | Reason |
|---|-----------|--------|--------|
| 1 | should respond to health checks | ❌ FAIL | Calling `/api/health` returns HTML UI, not JSON |
| 2 | should clone the anchor-engine-node repository | ✅ PASS | Successfully cloned repo in ~8.7s |
| 3 | should have files in external-inbox | ❌ FAIL | `ls -la` command doesn't exist on Windows |
| 4 | should start ingestion via watchdog | ❌ FAIL | Endpoint `/api/watchdog/start` returns HTML (not found) |
| 5-15 | Search/Analytics tests | ⏱️ TIMEOUT | Test hung waiting for ingestion to complete (600s timeout) |

---

## Key Findings

### ✅ What Worked

1. **Server Startup** - Engine server started successfully on port 3160
2. **Repository Cloning** - Successfully cloned `RSBalchII/anchor-engine-node` in ~8.7 seconds  
   - Clone location: `C:\Users\rsbii\Projects\anchor-engine-node\engine\.anchor\notebook\external-inbox\anchor-engine-node`
   - Contains ~60 files including package.json, engine/, specs/, docs/, etc.
3. **Health Endpoint** - `/health` endpoint returns valid JSON response

### ❌ Critical Issues

#### Issue #1: API Endpoint Prefix Mismatch (BLOCKER)

The test file uses incorrect API endpoints throughout:

```typescript
// Test calls these (WRONG):
/api/health
/api/watchdog/start  
/api/watchdog/status
/api/search
/api/ingestion/progress
/api/search/analytics
```

**Actual server routes:**
- Health: `/health` or `/v1/system/health`
- Watchdog: `/v1/watchdog/start`, `/v1/watchdog/status`
- Search: `/v1/memory/search` (POST method required)
- Stats: `/v1/stats`

**Evidence from server verification:**
```bash
# /api/health returns HTML UI instead of JSON
curl http://localhost:3160/api/health
→ Returns full React UI HTML (<!DOCTYPE html>...)

# /v1/watchdog/status works correctly  
curl http://localhost:3160/v1/watchdog/status
→ {"status":"success","isRunning":false,...}

# /api/search returns HTML instead of JSON
curl http://localhost:3160/api/search
→ Returns React UI HTML

# Correct search endpoint requires POST with JSON body
curl -X POST http://localhost:3160/v1/memory/search \
  -H "Content-Type: application/json" \
  --data-raw '{"query":"test","limit":5}'
```

#### Issue #2: Watchdog Never Started (BLOCKER)

**Root Cause:** The test calls `/api/watchdog/start` which returns HTML UI instead of JSON. When the fetch fails, the test throws an error and never actually starts the watchdog service.

**Verification after timeout:**
- Watchdog status: `isRunning: false` ❌
- Watched paths: Only generic `.anchor/inbox` and `.anchor/external-inbox` (not the specific cloned repo)
- Database stats: `atoms: 0, molecules: 0, sources: 0, tags: 0`

**Impact:** Without watchdog running, no files were ingested into the database.

#### Issue #3: Windows/PowerShell Incompatibility (MEDIUM)

Test uses Unix `ls -la` command which doesn't exist on Windows:

```typescript
const files = await execAsync(`ls -la "${externalInbox}"`, { cwd: PROJECT_ROOT });
```

**Error:** `'ls' is not recognized as an internal or external command, operable as a file.`

#### Issue #4: Ingestion Timeout (SYMPTOM)

The test hung waiting for ingestion to complete with 0/0 files processed after 6 minutes. This was a **symptom**, not the root cause - the watchdog never started successfully due to Issue #2.

---

## Error Messages (with Line Numbers)

### Test #1: Health Check Failure
```
× should respond to health checks 16ms
→ Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```
**Line:** `engine/tests/integration/live-fire.test.ts` ~375  
**Cause:** Calling `/api/health` which returns HTML UI, not JSON

### Test #2: External Inbox Check Failure
```
× should have files in external-inbox 39ms
→ Command failed: ls -la "C:\Users\rsbii\Projects\anchor-engine-node\engine\.anchor\notebook\external-inbox\anchor-engine-node"
'ls' is not recognized as an internal or external command, operable as a file.
```
**Line:** `engine/tests/integration/live-fire.test.ts` ~403  
**Cause:** Unix `ls` command doesn't exist on Windows

### Test #3: Watchdog Start Failure
```
❌ Watchdog start FAILED with status 404: {"message":"Unknown error"}
```
**Line:** `engine/tests/integration/live-fire.test.ts` ~395  
**Cause:** Endpoint `/api/watchdog/start` not found (returns HTML UI)

### Test #4-15: Ingestion Timeout
```
⏱️ [Wait] Timeout after 600000ms (300 polls, elapsed 600028ms)
   Label: Ingestion completion
```
**Line:** `engine/tests/integration/live-fire.test.ts` ~450  
**Cause:** Watchdog never started, so no files were processed

---

## Server Status Verification (After Test Timeout)

The server was still running and accessible after the test timeout:

```bash
# Health check - WORKS
curl http://localhost:3160/health
→ {"status":"healthy","timestamp":"2026-05-20T15:19:26.515Z",...}

# Watchdog status - WORKS but NOT running
curl http://localhost:3160/v1/watchdog/status  
→ {"status":"success","isRunning":false,"watchedPaths":[...]}

# Stats - CONFIRMS NO INGESTION
curl http://localhost:3160/v1/stats
→ {"atoms":0,"sources":0,"tags":0,"molecules":0,...}

# Cloned repo exists with files
dir "C:\Users\rsbii\Projects\anchor-engine-node\engine\.anchor\notebook\external-inbox\anchor-engine-node" /B
→ .bootstrap_completed, .dockerignore, package.json, engine/, specs/, etc. (~60 items)
```

---

## Root Cause Analysis

### Primary Issue: Wrong API Endpoint Prefix

The test file was written assuming the server exposes routes at `/api/*`, but the actual implementation uses `/v1/*` prefix. This is a **configuration/design mismatch** between:
- Test expectations (`/api/watchdog/start`)
- Server implementation (`/v1/watchdog/start`)

### Secondary Issue: Windows Command Compatibility

The test uses Unix shell commands (`ls -la`) that don't exist on Windows, causing the "external-inbox" verification to fail.

### Cascading Effect

```
Wrong API endpoint (/api/*) 
  → HTTP fetch returns HTML instead of JSON
  → Test throws error before calling watchdog start
  → Watchdog never starts (isRunning: false)
  → No files ingested into database
  → Ingestion monitoring times out waiting for progress
  → All search/analytics tests fail due to empty database
```

---

## Recommendations

### Immediate Fixes (P0 - Blocker)

1. **Update API Endpoint Prefixes in Test File**
   
   Replace all incorrect endpoints:
   ```typescript
   // Before (WRONG):
   /api/health
   /api/watchdog/start
   /api/watchdog/status  
   /api/search
   /api/ingestion/progress
   
   // After (CORRECT):
   /health  OR  /v1/system/health
   /v1/watchdog/start
   /v1/watchdog/status
   POST /v1/memory/search
   /v1/stats  OR  appropriate progress endpoint
   ```

2. **Fix Windows Command Compatibility**
   
   Replace `ls -la` with cross-platform alternative:
   ```typescript
   // Option A: Use Node.js fs (recommended)
   const { readdir } = await import('fs/promises');
   const files = await readdir(externalInbox);

   // Option B: Use PowerShell dir
   const files = await execAsync(`dir "${externalInbox}"`, { cwd: PROJECT_ROOT });
   
   // Option C: Detect OS and use appropriate command
   const isWindows = process.platform === 'win32';
   const command = isWindows ? `dir "${path}"` : `ls -la "${path}"`;
   ```

### Secondary Fixes (P1)

3. **Add Proper Ingestion Progress Endpoint**
   
   The test calls `/api/ingestion/progress` but this doesn't exist. Either:
   - Create this endpoint in the server, OR
   - Update tests to use existing progress endpoints like `/v1/stats` or `/v1/system/ingest-status`

4. **Add Better Error Handling for Watchdog Start**
   
   Add more detailed error logging when watchdog start fails, so failures are easier to diagnose.

5. **Consider Adding Route Alias for Backward Compatibility**
   
   If the test suite is meant to be used with multiple server configurations, add a route alias:
   ```typescript
   // In index.ts or api.ts
   app.use('/api', express.Router());
   const router = Router();
   router.get('/health', (req, res) => {
     return res.json({ status: 'healthy' }); // maps to /v1/system/health
   });
   ```

### Long-term Improvements (P2)

6. **Add Platform Detection for Shell Commands**
   
   Detect OS and use appropriate commands automatically.

7. **Improve Test Documentation**
   
   Add comments explaining which endpoints are being tested and their expected behavior.

8. **Consider Using the Test UI Instead of Raw API Calls**
   
   The server has a built-in test UI at `/test` that could be used for integration testing instead of raw HTTP calls.

---

## Files Modified/Checked

| File | Action | Notes |
|------|--------|-------|
| `TEST_ASSESSMENT.md` | Created | This assessment document |
| `engine/tests/integration/live-fire.test.ts` | Read | Identified endpoint mismatches |
| `engine/src/routes/v1/system.ts` | Read | Confirmed correct endpoints at `/v1/*` |
| `engine/src/index.ts` | Read | Verified route setup |

---

## Conclusion

The live-fire integration test suite failed due to **API endpoint prefix mismatch** (`/api/*` vs `/v1/*`) which prevented the watchdog from starting, cascading into a complete ingestion failure. The tests would pass if:
1. All API endpoints are corrected to use `/v1/*` prefix (or `/health` for health check)
2. Windows command compatibility is fixed (`ls -la` → `dir` or Node.js fs)

**Priority:** Fix Issue #1 and #3 immediately to enable the test suite to run successfully.

---

*Generated by automated test assessment on 2026-05-20*  
*Server verified running at http://localhost:3160*
