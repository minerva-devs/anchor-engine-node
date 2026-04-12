/**
 * Search Results Logger – lightweight helper used by unit tests.
 * ===============================
 *
 * The real production code writes a JSON file containing all results for a
 * single search invocation.  For the purposes of the test suite we only need
 * to capture:
 *   • the original query string (truncated)
 *   • a deterministic hash derived from that string – this allows tests to
 *     locate the exact log file regardless of when it was created.
 *   • the `engineVersion` field added in the current feature‑build.
 *
 * Implementation strategy:
 *   1. All log files live under `C:\Users\<user>\.anchor\logs` – the helper
 *      guarantees that the directory exists.
 *   2. When `logSearchResults()` is called we immediately write a new JSON
 *      entry to a file named with an ISO‑8601 timestamp plus the query hash.
 *   3. To keep the repository tidy we expose a small API:
 *        - listLogFiles()   – returns all filenames.
 *        - getLatestEntryForHash(hash) – loads the newest file for that hash
 *          and returns the single {@link SearchLogEntry} stored inside it.
 *        - clearAllLogsCache() – clears the in‑memory map used by the helpers.
 *
 * The helper is intentionally simple – no async I/O, no external
 * libraries, and all paths are built with Node's `path` module to avoid OS
 * specific surprises.
 */

import fs from 'fs';
import path from 'path';

// Root directory for Anchor artefacts – e.g. C:\Users\<user>\.anchor
const ANCHOR_ROOT = path.resolve(process.cwd(), '..', '..'); // aen → project root
const LOGS_DIR = path.join(ANCHOR_ROOT, '.anchor', 'logs');

/** Maximum number of entries we keep per unique query hash. */
const MAX_ENTRIES_PER_HASH = 50;
/** Optional: maximum file size (MiB) before we start trimming aggressively. */
const MAX_LOG_FILE_SIZE_MB = 10;

// In‑memory cache mapping a query hash → { path, lastWrite }
const logFileCache = new Map<string, { path: string; lastWrite: number }>();

/** Ensure the log directory exists – idempotent. */
function ensureLogDir(): void {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
}

/** Check if search logging is enabled via environment variable. */
export function isSearchLoggingEnabled(): boolean {
  const val = process.env.ANCHOR_SEARCH_LOG ?? '';
  return val === '1' || val.toLowerCase() === 'true';
}

/** Generate a deterministic hex‑string hash from the query text. */
export function generateQueryHash(query: string): string {
  const normalized = query.toLowerCase().trim();
  let h = 0;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) - h + normalized.charCodeAt(i)) | 0; // eslint-disable-line no-bitwise
  }
  return Math.abs(h).toString(16);
}

/** Entry format written into the JSON file (one per invocation). */
export interface SearchLogEntry {
  timestamp: string;          // ISO‑8601 UTC
  unixTimestamp: number;      // epoch ms – handy for debugging/logging
  queryHash: string;
  originalQuery: string;     // full query trimmed to 200 chars
  results: Array<{
    id: string;
    content: string;   // truncated to 500 chars for storage efficiency
    source: string;      // file path or other identifier
    timestamp?: number; // optional – may come from the underlying source
    score?: number;
    tags?: string[];
    buckets?: string[];
    provenance?: string;
  }>;
  metadata: {
    strategy: string;
    totalResults: number;
    durationMs?: number;
    splitQueries?: string[];
    buckets?: string[];
    tags?: string[];
    engineVersion?: string;      // added by current feature
  };
}

/**
 * Persist a single search invocation.
 * The helper will create a new file with a timestamped name and write the
 * {@link SearchLogEntry}.  After writing we optionally trim the file if it
 * grows beyond {@link MAX_LOG_FILE_SIZE_MB} or contains more than
 * {@link MAX_ENTRIES_PER_HASH} entries.
 */
export function logSearchResults(
  query: string,
  results: Array<any>,
  metadata: Partial<SearchLogEntry["metadata"]> = {},
  options?: { verbose?: boolean; force?: boolean }
): void {
  const enabled = (options?.verbose ?? false) || (options?.force ?? false);
  if (!enabled && !process.env.ANCHOR_SEARCH_LOG) return;

  ensureLogDir();
  const queryHash = generateQueryHash(query);
  const ts = new Date().toISOString().replace(/[:.\s]/g, '-'); // safe for filenames
  const fileName = `${ts}_search_${queryHash}.json`;
  const filePath = path.join(LOGS_DIR, fileName);

  const entry: SearchLogEntry = {
    timestamp: new Date().toISOString(),
    unixTimestamp: Date.now(),
    queryHash,
    originalQuery: query.substring(0, 200),
    results: results.map(r => ({
      id: r.id ?? '',
      content: typeof r.content === 'string' ? r.content.substring(0, 500) : '',
      source: r.source_path ?? r.source ?? '',
      timestamp: r.timestamp,
      score: r.score,
      tags: r.tags || [],
      buckets: r.buckets || [],
      provenance: r.provenance,
    })),
    metadata: {
      strategy: metadata.strategy ?? 'unknown',
      totalResults: metadata.totalResults ?? results.length,
      durationMs: metadata.durationMs,
      splitQueries: metadata.splitQueries,
      buckets: metadata.buckets,
      tags: metadata.tags,
      engineVersion: process.env.ENGINE_VERSION ?? 'unknown',
    },
  };

  // Write entry – we first load any existing content to apply the trim logic.
  let currentEntries: SearchLogEntry[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      currentEntries = JSON.parse(raw) as SearchLogEntry[];
    } catch (_) {
      // corrupted – start fresh
      currentEntries = [];
    }
  }

  currentEntries.push(entry);

  // Trim: keep only the last MAX_ENTRIES_PER_HASH entries.
  if (currentEntries.length > MAX_ENTRIES_PER_HASH) {
    currentEntries = currentEntries.slice(-MAX_ENTRIES_PER_HASH);
  }

  // Optional size‑based trim – replace with a more aggressive strategy if needed.
  const serialized = JSON.stringify(currentEntries, null, 2);
  const sizeMB = Buffer.byteLength(serialized, 'utf-8') / (1024 * 1024);
  if (sizeMB > MAX_LOG_FILE_SIZE_MB) {
    // Rough heuristic: drop half of the remaining entries until we are
    // below the threshold.
    while (currentEntries.length && sizeMB > MAX_LOG_FILE_SIZE_MB) {
      currentEntries = currentEntries.slice(1); // remove oldest
      const newSize = Buffer.byteLength(JSON.stringify(currentEntries, null, 2), 'utf-8') / (1024 * 1024);
      if (newSize <= MAX_LOG_FILE_SIZE_MB) break;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(currentEntries, null, 2), 'utf-8');
  // Update cache so subsequent lookups for the same hash reuse the path.
  logFileCache.set(queryHash, { path: filePath, lastWrite: Date.now() });
}

/** Helper used by unit tests – returns all filenames in the log directory. */
export function listLogFiles(): string[] {
  ensureLogDir();
  return fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.json'));
}

/** Retrieve the most recent {@link SearchLogEntry} for a given query hash.
 * The function walks the log directory, finds the file whose name
 * contains `_search_${hash}.json` and returns the last stored entry.
 */
export function getLatestEntryForHash(hash: string): SearchLogEntry | null {
  ensureLogDir();
  const candidates = fs.readdirSync(LOGS_DIR)
    .filter(f => f.endsWith('.json') && f.includes(`_search_${hash}.json`))
    .sort((a, b) => a.localeCompare(b));
  if (!candidates.length) return null;
  const latestFile = candidates[candidates.length - 1];
  const content = fs.readFileSync(path.join(LOGS_DIR, latestFile), 'utf-8');
  const entries: SearchLogEntry[] = JSON.parse(content);
  return entries.length ? entries[entries.length - 1] : null;
}

/** Clear the in‑memory cache – useful for isolated test runs. */
export function clearCachedLogs(): void { logFileCache.clear(); }

/** Alias kept for backward compatibility with older test code. */
export function clearAllLogsCache(): void { clearCachedLogs(); }
