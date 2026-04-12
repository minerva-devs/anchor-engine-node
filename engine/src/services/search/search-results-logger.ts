/**
 * Search Results Logger for Test Verification
 * 
 * Logs search results to .anchor/logs/ for test output verification.
 * Implements truncation to prevent unbounded growth - keeps only last N entries.
 * Only activates when verbose flag is set or ANCHOR_SEARCH_LOG env var.
 *
 * Standards: 136 (Streaming Search) + Test Output Verification
 */

import fs from 'fs';
import path from 'path';

// Log directory at user root: C:\Users\<user>\.anchor/logs/
// This is relative to process.cwd() + '..' (parent of aen)
const LOGS_DIR = path.join(
  path.resolve(process.cwd(), '..', '..'), // Go up from engine -> aen -> user home
  '.anchor',
  'logs'
);

// Truncate settings - keep last N entries per query type
const MAX_ENTRIES_PER_QUERY = 50; // Last 50 searches per unique query hash
const MAX_LOG_FILE_SIZE_MB = 10; // Max file size before truncation

// In-memory cache of recent log files (by query hash)
const recentLogs = new Map<string, { path: string; entries: Array<any>; lastWrite: number }>();

/**
 * Search result metadata for logging context
 */
export interface SearchLogMetadata {
  strategy: string;
  totalResults: number;
  durationMs?: number;
  splitQueries?: string[];
  buckets?: string[];
  tags?: string[];
}

/**
 * Full search log entry structure
 */
export interface SearchLogEntry {
  timestamp: string;
  unixTimestamp: number;
  queryHash: string;
  originalQuery: string;
  results: Array<any>; // SearchResult objects
  metadata: SearchLogMetadata;
}

/**
 * Generate a hash for the search query (for grouping)
 */
function generateQueryHash(query: string): string {
  const normalized = query.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash + normalized.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Check if search logging is enabled
 */
export function isSearchLoggingEnabled(): boolean {
  const envVar = process.env.ANCHOR_SEARCH_LOG || '';
  return envVar === '1' || envVar === 'true';
}

/**
 * Ensure log directory exists
 */
function ensureLogDir(): void {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Get or create a log file entry for this query hash
 */
function getOrCreateLogFile(queryHash: string): { path: string; entries: Array<any> } {
  const existing = recentLogs.get(queryHash);
  if (existing && Date.now() - existing.lastWrite < 60000) {
    // Reusing same file within last minute - return cached entry list
    return { path: existing.path, entries: existing.entries };
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${timestamp}_search_${queryHash}.json`;
  const filePath = path.join(LOGS_DIR, filename);

  // Load existing entries if file exists
  let entries: Array<any> = [];
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      entries = JSON.parse(content);
    }
  } catch (e) {
    // File might be corrupted or new - start fresh
    console.log(`[SearchLogger] Starting fresh log for query hash ${queryHash}`);
  }

  const entry = { path: filePath, entries };
  recentLogs.set(queryHash, entry);
  
  if (recentLogs.size > MAX_ENTRIES_PER_QUERY * 2) {
    // Prune old entries - keep only most recent N per hash
    const keysToDelete = Array.from(recentLogs.keys()).slice(0, Math.floor(recentLogs.size / 2));
    for (const key of keysToDelete) {
      recentLogs.delete(key);
    }
  }

  return entry;
}

/**
 * Truncate a log file to last N entries and enforce size limit
 */
function truncateLogFile(filePath: string, maxEntries: number = MAX_ENTRIES_PER_QUERY): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content) return;
    
    const entries = JSON.parse(content);
    
    // Truncate to last N entries
    const truncated = entries.slice(-maxEntries);
    
    // Check file size - if still too large, reduce further
    const serialized = JSON.stringify(truncated);
    const sizeMB = serialized.length / (1024 * 1024);
    
    if (sizeMB > MAX_LOG_FILE_SIZE_MB) {
      // Reduce to fit within size limit
      const maxEntriesForSize = Math.floor(maxEntries * (MAX_LOG_FILE_SIZE_MB / sizeMB));
      truncated.splice(0, truncated.length - maxEntriesForSize);
    }
    
    fs.writeFileSync(filePath, JSON.stringify(truncated, null, 2), 'utf-8');
  } catch (e) {
    console.error(`[SearchLogger] Failed to truncate ${filePath}:`, e.message);
  }
}

/**
 * Log search results with optional filtering by verbose flag
 * 
 * @param query - The original search query string
 * @param results - Array of SearchResult objects from the search pipeline
 * @param metadata - Search metadata (strategy, duration, etc.)
 * @param options - Optional flags including { verbose: boolean } to force logging
 */
export function logSearchResults(
  query: string,
  results: Array<any>,
  metadata: SearchLogMetadata,
  options?: { verbose?: boolean; force?: boolean }
): void {
  // Check if logging should be active
  const enabled = isSearchLoggingEnabled() || options?.verbose || options?.force;
  
  if (!enabled) return;

  ensureLogDir();

  const queryHash = generateQueryHash(query);
  const logFile = getOrCreateLogFile(queryHash);
  
  const entry: SearchLogEntry = {
    timestamp: new Date().toISOString(),
    unixTimestamp: Date.now(),
    queryHash,
    originalQuery: query.substring(0, 200), // Truncate long queries
    results: results.map(r => ({
      id: r.id,
      content: r.content?.substring(0, 500) || '', // Truncate content for storage efficiency
      source: r.source_path || r.source,
      timestamp: r.timestamp,
      score: r.score,
      tags: r.tags || [],
      buckets: r.buckets || [],
      provenance: r.provenance,
    })),
    metadata: {
      ...metadata,
      resultCount: results.length,
    },
  };

  logFile.entries.push(entry);
  logFile.lastWrite = Date.now();

  // Truncate file if it has too many entries
  if (logFile.entries.length > MAX_ENTRIES_PER_QUERY) {
    truncateLogFile(logFile.path, MAX_ENTRIES_PER_QUERY);
    logFile.entries = JSON.parse(fs.readFileSync(logFile.path, 'utf-8'));
  }

  // Write to disk immediately for test visibility
  fs.writeFileSync(logFile.path, JSON.stringify(logFile.entries, null, 2), 'utf-8');

  console.log(`[SearchLogger] Logged ${results.length} results for query "${query.substring(0, 50)}..."`);
}

/**
 * Get all logged search entries for a specific query hash (for test verification)
 */
export function getLoggedEntries(queryHash: string): Array<SearchLogEntry> | null {
  const logFile = recentLogs.get(queryHash);
  if (!logFile) return null;
  
  try {
    const content = fs.readFileSync(logFile.path, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

/**
 * Clear all cached log entries (useful between test runs)
 */
export function clearCachedLogs(): void {
  recentLogs.clear();
}

/**
 * List all log files in the logs directory for verification
 */
export function listLogFiles(): string[] {
  ensureLogDir();
  
  if (!fs.existsSync(LOGS_DIR)) {
    return [];
  }
  
  const files = fs.readdirSync(LOGS_DIR);
  return files.filter(f => f.endsWith('.json'));
}
