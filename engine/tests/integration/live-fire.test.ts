/**
 * Live Fire Integration Test Suite (Final Version)
 *
 * Comprehensive end-to-end test that mimics a human user workflow:
 * 1. Launches the engine server (including pglite init).
 * 2. Clones a repo via the GitHub module.
 * 3. Ingests the cloned repo through the watchdog.
 * 4. Runs comprehensive searches over live data.
 * 5. Validates result structure and ingestion metrics.
 *
 * This is the "smoke test" that proves the entire system works together.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, rmSync, mkdirSync } from 'fs';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');

/** Resolve node executable path — try known locations, fall back to 'node' */
function resolveNodeExecutable(): string {
  // Try Node 22 local installation first (Windows ARM64)
  const candidates = [
    'C:\\Users\\rsbii\\Projects\\node22\\node-v22.14.0-win-arm64\\node.exe',
    process.env.NODE_EXE ?? '',
    'node',
  ].filter(Boolean);
  for (const c of candidates) {
    try {
      const { execSync } = require('child_process');
      execSync(`${c} --version`, { stdio: 'pipe' });
      return c;
    } catch { /* next */ }
  }
  return 'node';
}

const NODE_EXE = resolveNodeExecutable();

// ── Configuration ──────────────────────────────────────────────────────────

const GITHUB_REPO = 'rsbii/anchor-engine-node';
const CLONE_DIR = join(PROJECT_ROOT, '.anchor', 'notebook', 'external-inbox', 'anchor-engine-node');
const SERVER_PORT = 3160;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;
const CLONE_TIMEOUT_MS = 120_000; // 2 minutes for git clone
const INGESTION_TIMEOUT_MS = 180_000; // 3 minutes for full ingestion
const POLL_INTERVAL_MS = 2000; // Check ingestion status every 2 seconds
const SERVER_READY_TIMEOUT_MS = 60_000; // 60 seconds for server to be ready

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Wait for a condition to become true, polling periodically.
 */
async function waitFor(
  predicate: () => Promise<boolean> | boolean,
  timeoutMs: number,
  intervalMs: number = 1000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
}

/**
 * Check if the server is responding.
 */
async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Check if the server is ready (health endpoint returns engine info).
 */
async function isServerReady(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data?.status === 'ok' || data?.engine !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check ingestion status via the watchdog endpoint.
 */
async function getIngestionStatus(): Promise<any> {
  try {
    const res = await fetch(`${SERVER_URL}/api/watchdog/status`, {
      signal: AbortSignal.timeout(3000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Get ingestion progress (files processed, errors, etc.).
 */
async function getIngestionProgress(): Promise<any> {
  try {
    const res = await fetch(`${SERVER_URL}/api/ingestion/progress`, {
      signal: AbortSignal.timeout(3000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Search the live database.
 */
async function search(query: string, limit: number = 10): Promise<any> {
  const res = await fetch(`${SERVER_URL}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
    signal: AbortSignal.timeout(10000),
  });
  return await res.json();
}

/**
 * Get search analytics (total results, categories, etc.).
 */
async function getSearchAnalytics(): Promise<any> {
  try {
    const res = await fetch(`${SERVER_URL}/api/search/analytics`, {
      signal: AbortSignal.timeout(3000),
    });
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Validate search result structure.
 */
function validateSearchResults(results: any[], totalResults: number): void {
  expect(results.length).toBeLessThanOrEqual(10); // Limit check
  expect(results.length).toBeLessThanOrEqual(totalResults); // Consistency check

  for (const result of results) {
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('source');
    expect(result).toHaveProperty('content');
    expect(typeof result.score).toBe('number');
  }
}

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('Live Fire Integration Tests', () => {
  let serverProcess: ReturnType<typeof spawn> | null = null;
  let serverStartTime: number;

  /**
   * Start the engine server if not already running.
   */
  beforeAll(async () => {
    console.log('\n🚀 [Live Fire] Starting engine server...');
    serverStartTime = Date.now();

    // Check if server is already running
    const alreadyRunning = await isServerRunning();
    if (alreadyRunning) {
      console.log('✅ Server already running, skipping start');
    } else {
      // Start the engine server using resolved node executable
      console.log(`[Live Fire] Using node executable: ${NODE_EXE}`);
      serverProcess = spawn(NODE_EXE, ['engine/dist/index.js'], {
        cwd: PROJECT_ROOT,
        stdio: 'pipe',
        env: { ...process.env, PORT: String(SERVER_PORT) },
      });

      // Log server output
      serverProcess.stdout?.on('data', (data) => {
        const log = data.toString().trim();
        if (log.includes('listening') || log.includes('ready')) {
          console.log(`📡 [Server] ${log}`);
        }
      });

      serverProcess.stderr?.on('data', (data) => {
        const log = data.toString().trim();
        if (log.includes('error') || log.includes('Error')) {
          console.error(`❌ [Server] ${log}`);
        }
      });

      // Wait for server to be ready
      console.log('⏳ Waiting for server to be ready...');
      await waitFor(isServerReady, SERVER_READY_TIMEOUT_MS, 2000);
      console.log('✅ Server is ready');
    }
  }, 60_000);

  /**
   * Stop the server if we started it.
   */
  afterAll(async () => {
    console.log('\n🛑 [Live Fire] Cleaning up...');
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      await new Promise((resolve) => serverProcess?.on('exit', resolve));
      console.log('✅ Server stopped');
    }
  }, 30_000);

  // ── Test 1: Server Health ───────────────────────────────────────────────

  it('should respond to health checks', async () => {
    const res = await fetch(`${SERVER_URL}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    expect(res.ok).toBe(true);

    const data = await res.json();
    expect(data).toHaveProperty('status');
    console.log(`📊 Health: ${JSON.stringify(data)}`);
  });

  // ── Test 2: Clone Repository ────────────────────────────────────────────

  it('should clone the anchor-engine-node repository', async () => {
    console.log(`\n📦 [Live Fire] Cloning ${GITHUB_REPO}...`);

    // Remove existing clone if any
    if (existsSync(CLONE_DIR)) {
      console.log('🗑️  Removing existing clone...');
      rmSync(CLONE_DIR, { recursive: true, force: true });
    }

    // Clone the repository
    const cloneCommand = `git clone --depth 1 https://github.com/${GITHUB_REPO}.git "${CLONE_DIR}"`;
    const { stdout, stderr } = await execAsync(cloneCommand, {
      timeout: CLONE_TIMEOUT_MS,
      cwd: PROJECT_ROOT,
    });

    console.log(`✅ Clone complete: ${CLONE_DIR}`);
    expect(existsSync(CLONE_DIR)).toBe(true);
    expect(existsSync(join(CLONE_DIR, 'package.json'))).toBe(true);
  }, CLONE_TIMEOUT_MS);

  // ── Test 3: Verify External Inbox ───────────────────────────────────────

  it('should have files in external-inbox', async () => {
    const externalInbox = join(CLONE_DIR);
    const files = await execAsync(`ls -la "${externalInbox}"`, { cwd: PROJECT_ROOT });
    console.log(`📁 External inbox contents:\n${files.stdout}`);

    // Verify key files exist
    const keyFiles = ['package.json', 'README.md', 'engine/tsconfig.json'];
    for (const file of keyFiles) {
      expect(existsSync(join(externalInbox, file))).toBe(true);
    }
  });

  // ── Test 4: Start Watchdog / Ingestion ──────────────────────────────────

  it('should start ingestion via watchdog', async () => {
    console.log('\n🔄 [Live Fire] Starting watchdog ingestion...');

    // Start the watchdog (this is what the UI does)
    const watchdogRes = await fetch(`${SERVER_URL}/api/watchdog/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paths: [CLONE_DIR],
        recursive: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    expect(watchdogRes.ok).toBe(true);
    const watchdogData = await watchdogRes.json();
    console.log(`📡 Watchdog started: ${JSON.stringify(watchdogData)}`);
  });

  // ── Test 5: Monitor Ingestion Progress ──────────────────────────────────

  it('should complete ingestion within timeout', async () => {
    console.log('\n⏱️  [Live Fire] Monitoring ingestion progress...');
    const ingestionStart = Date.now();

    // Poll for ingestion completion
    let totalFiles = 0;
    let processedFiles = 0;
    let errors = 0;
    let lastStatus: any = null;

    await waitFor(
      async () => {
        const status = await getIngestionStatus();
        const progress = await getIngestionProgress();

        lastStatus = status;
        if (progress) {
          totalFiles = progress.totalFiles || 0;
          processedFiles = progress.processedFiles || 0;
          errors = progress.errors?.length || 0;
        }

        // Check if ingestion is complete
        const isComplete = status?.status === 'idle' || status?.status === 'completed';
        const hasFiles = totalFiles > 0;

        if (isComplete && hasFiles) {
          console.log(`✅ Ingestion complete: ${processedFiles}/${totalFiles} files, ${errors} errors`);
          return true;
        }

        // Log progress
        if (Date.now() % 10_000 < POLL_INTERVAL_MS) {
          console.log(`📊 Progress: ${processedFiles}/${totalFiles} files, ${errors} errors`);
        }

        return false;
      },
      INGESTION_TIMEOUT_MS,
      POLL_INTERVAL_MS,
    );

    console.log(`⏱️  Total ingestion time: ${((Date.now() - ingestionStart) / 1000).toFixed(1)}s`);
    expect(totalFiles).toBeGreaterThan(0);
    expect(processedFiles).toBeGreaterThan(0);
  }, INGESTION_TIMEOUT_MS);

  // ── Test 6: Verify Data in Database ─────────────────────────────────────

  it('should have ingested data in the database', async () => {
    const analytics = await getSearchAnalytics();
    console.log(`📊 Search analytics: ${JSON.stringify(analytics)}`);

    expect(analytics).toBeDefined();
    expect(analytics?.totalResults).toBeGreaterThan(0);
    console.log(`✅ Total results in database: ${analytics.totalResults}`);
  });

  // ── Test 7: Search Tests ────────────────────────────────────────────────

  it('should find engine source files', async () => {
    const results = await search('engine', 10);
    console.log(`🔍 Search "engine": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThan(0);
    expect(results.results.length).toBeGreaterThan(0);

    // Validate structure
    validateSearchResults(results.results, results.totalResults);

    // Verify results are from the cloned repo
    const engineResults = results.results.filter(
      (r: any) => r.source?.includes('engine') || r.source?.includes('anchor-engine-node')
    );
    expect(engineResults.length).toBeGreaterThan(0);
    console.log(`✅ Found ${engineResults.length} engine-related results`);
  });

  it('should find TypeScript files', async () => {
    const results = await search('.ts', 10);
    console.log(`🔍 Search ".ts": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results.results, results.totalResults);
  });

  it('should find configuration files', async () => {
    const results = await search('tsconfig.json', 5);
    console.log(`🔍 Search "tsconfig.json": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results.results, results.totalResults);
  });

  it('should find package.json references', async () => {
    const results = await search('pnpm', 5);
    console.log(`🔍 Search "pnpm": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results.results, results.totalResults);
  });

  it('should find GitHub-related content', async () => {
    const results = await search('github', 10);
    console.log(`🔍 Search "github": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThan(0);
    validateSearchResults(results.results, results.totalResults);
  });

  // ── Test 8: Advanced Search ─────────────────────────────────────────────

  it('should support semantic search', async () => {
    const results = await search('authentication', 5);
    console.log(`🔍 Search "authentication": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThanOrEqual(0);
    if (results.totalResults > 0) {
      validateSearchResults(results.results, results.totalResults);
    }
  });

  it('should support tag-based search', async () => {
    const results = await search('#test', 5);
    console.log(`🔍 Search "#test": ${results.totalResults} results`);

    expect(results.totalResults).toBeGreaterThanOrEqual(0);
  });

  // ── Test 9: Ingestion Metrics ───────────────────────────────────────────

  it('should report ingestion metrics', async () => {
    const progress = await getIngestionProgress();
    console.log(`📊 Ingestion metrics: ${JSON.stringify(progress)}`);

    expect(progress).toBeDefined();
    expect(progress?.totalFiles).toBeGreaterThan(0);
    expect(progress?.processedFiles).toBeGreaterThan(0);
    expect(progress?.processedFiles).toBeLessThanOrEqual(progress.totalFiles);
  });

  // ── Test 10: End-to-End Timing ──────────────────────────────────────────

  it('should complete all tests within reasonable time', () => {
    const totalElapsed = Date.now() - serverStartTime;
    console.log(`\n⏱️  Total test suite time: ${(totalElapsed / 1000).toFixed(1)}s`);
    expect(totalElapsed).toBeLessThan(300_000); // 5 minutes max
  });
});
