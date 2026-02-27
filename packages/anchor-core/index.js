/**
 * @rbalchii/anchor-core
 *
 * Native C++ core for Anchor Engine
 * Uses Koffi FFI for fast, reliable DLL loading
 *
 * High-performance SQLite3 backend with:
 * - FTS5 full-text search
 * - Physics-based graph traversal
 * - Context inflation (n-1, n+1)
 * - 5-layer deduplication
 * - Transient content filtering
 */

import koffi from 'koffi';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find native library for current platform
const platformMap = { win32: 'win', linux: 'linux', darwin: 'darwin' };
const archMap = { x64: 'x64', arm64: 'arm64', ia32: 'ia32' };
const extMap = { win32: '.dll', linux: '.so', darwin: '.dylib' };
const platform = platformMap[process.platform] || process.platform;
const arch = archMap[process.arch] || process.arch;
const ext = extMap[process.platform] || '.so';
const libPrefix = process.platform === 'win32' ? '' : 'lib';
const DLL_PATH = path.join(__dirname, 'lib', platform + '-' + arch, libPrefix + 'anchor_core' + ext);

if (!existsSync(DLL_PATH)) {
  throw new Error(`Native library not found for ${process.platform}-${process.arch}. Expected at: ${DLL_PATH}`);
}

console.log('[anchor-core] Loading native library from:', DLL_PATH);

// Load the library
const lib = koffi.load(DLL_PATH);

// Define all FFI functions
const ffi = {
  // Database
  database_create: lib.func('database_create', 'void *', ['string']),
  database_destroy: lib.func('database_destroy', 'void', ['void *']),
  database_begin_transaction: lib.func('database_begin_transaction', 'bool', ['void *']),
  database_commit_transaction: lib.func('database_commit_transaction', 'bool', ['void *']),
  database_search_atoms: lib.func('database_search_atoms', 'string', ['void *', 'string', 'int64']),
  database_get_stats: lib.func('database_get_stats', 'string', ['void *']),
  database_insert_atom: lib.func('database_insert_atom', 'int64', ['void *', 'string', 'string', 'int64', 'int64', 'double', 'uint64', 'string', 'int64', 'int64']),

  // Physics Walker
  physics_walker_create: lib.func('physics_walker_create', 'void *', ['double', 'double', 'int64']),
  physics_walker_destroy: lib.func('physics_walker_destroy', 'void', ['void *']),
  physics_walker_radial_inflation: lib.func('physics_walker_radial_inflation', 'string', ['void *', 'void *', 'string', 'int64', 'double']),

  // Context Inflator
  context_inflator_create: lib.func('context_inflator_create', 'void *', ['int64', 'bool']),
  context_inflator_destroy: lib.func('context_inflator_destroy', 'void', ['void *']),
  context_inflator_inflate: lib.func('context_inflator_inflate', 'string', ['void *', 'void *', 'string', 'int64']),

  // Deduplicator
  deduplicator_create: lib.func('deduplicator_create', 'void *', ['double', 'int64']),
  deduplicator_destroy: lib.func('deduplicator_destroy', 'void', ['void *']),
  deduplicator_deduplicate: lib.func('deduplicator_deduplicate', 'string', ['void *', 'string']),

  // Transient Filter
  transient_filter_create: lib.func('transient_filter_create', 'void *', ['int64', 'bool']),
  transient_filter_destroy: lib.func('transient_filter_destroy', 'void', ['void *']),
  transient_filter_apply: lib.func('transient_filter_apply', 'string', ['void *', 'string'])
};

console.log('[anchor-core] Native library loaded successfully');

/**
 * Anchor Core API - High-performance C++ backend
 */
export class AnchorCore {
  #db = null;
  #walker = null;
  #inflator = null;
  #dedup = null;
  #filter = null;

  /**
   * Initialize database
   * @param {string} dbPath - Database path (default: in-memory)
   */
  init(dbPath = ':memory:') {
    try {
      console.log('[anchor-core] Creating database at:', dbPath);
      this.#db = ffi.database_create(dbPath);
      console.log('[anchor-core] DB pointer:', this.#db);
      if (!this.#db) {
        throw new Error('database_create returned null - check C++ logs');
      }
      this.#walker = ffi.physics_walker_create(0.85, 0.0001, 3);
      this.#inflator = ffi.context_inflator_create(205, true);
      this.#dedup = ffi.deduplicator_create(0.5, 5);
      this.#filter = ffi.transient_filter_create(20, false);
      console.log('[anchor-core] Database initialized');
    } catch (error) {
      console.error('[anchor-core] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    try {
      if (this.#filter) ffi.transient_filter_destroy(this.#filter);
      if (this.#dedup) ffi.deduplicator_destroy(this.#dedup);
      if (this.#inflator) ffi.context_inflator_destroy(this.#inflator);
      if (this.#walker) ffi.physics_walker_destroy(this.#walker);
      if (this.#db) ffi.database_destroy(this.#db);
      console.log('[anchor-core] Resources cleaned up');
    } catch (error) {
      console.error('[anchor-core] Cleanup failed:', error);
    }
  }

  /**
   * Search atoms with FTS5
   * @param {string} query - Search query
   * @param {number} limit - Max results
   * @returns {Array} Search results
   */
  search(query, limit = 100) {
    if (!this.#db) throw new Error('Database not initialized');
    const json = ffi.database_search_atoms(this.#db, query, limit);
    return JSON.parse(json);
  }

  /**
   * Get database statistics
   * @returns {Object} Stats
   */
  getStats() {
    if (!this.#db) throw new Error('Database not initialized');
    const json = ffi.database_get_stats(this.#db);
    return JSON.parse(json);
  }

  /**
   * Begin database transaction
   */
  beginTransaction() {
    if (!this.#db) throw new Error('Database not initialized');
    return ffi.database_begin_transaction(this.#db);
  }

  /**
   * Commit database transaction
   */
  commitTransaction() {
    if (!this.#db) throw new Error('Database not initialized');
    return ffi.database_commit_transaction(this.#db);
  }

  /**
   * Insert atom
   * @param {string} sourceId - Source ID
   * @param {string} content - Content
   * @param {number} charStart - Start char offset
   * @param {number} charEnd - End char offset
   * @param {number} timestamp - Timestamp
   * @param {bigint} simhash - SimHash value
   * @returns {number} Atom ID
   */
  insertAtom(sourceId, content, charStart, charEnd, timestamp, simhash, compoundId, startByte, endByte) {
    if (!this.#db) throw new Error('Database not initialized');
    return ffi.database_insert_atom(
      this.#db,
      sourceId,
      content,
      BigInt(charStart),
      BigInt(charEnd),
      timestamp,
      BigInt(simhash),
      compoundId || "",
      BigInt(startByte || 0),
      BigInt(endByte || 0)
    );
  }

  /**
   * Perform graph traversal (radial inflation)
   * @param {number[]} anchorIds - Anchor atom IDs
   * @param {number} limit - Max results
   * @param {number} threshold - Gravity threshold
   * @returns {Array} Candidates
   */
  radialInflation(anchorIds, limit = 150, threshold = 0.005) {
    if (!this.#db || !this.#walker) throw new Error('Not initialized');
    const json = ffi.physics_walker_radial_inflation(
      this.#walker,
      this.#db,
      JSON.stringify(anchorIds),
      limit,
      threshold
    );
    return JSON.parse(json);
  }

  /**
   * Inflate context (n-1, n+1 expansion)
   * @param {number[]} atomIds - Atom IDs to inflate
   * @param {number} maxChars - Maximum characters
   * @returns {Array} Inflated atoms
   */
  inflateContext(atomIds, maxChars = 65536) {
    if (!this.#db || !this.#inflator) throw new Error('Not initialized');
    const json = ffi.context_inflator_inflate(
      this.#inflator,
      this.#db,
      JSON.stringify(atomIds),
      maxChars
    );
    return JSON.parse(json);
  }

  /**
   * Deduplicate candidates using 5-layer strategy
   * @param {Array} candidates - Candidate results
   * @returns {Array} Unique candidates
   */
  deduplicate(candidates) {
    if (!this.#dedup) throw new Error('Not initialized');
    const json = ffi.deduplicator_deduplicate(this.#dedup, JSON.stringify(candidates));
    return JSON.parse(json);
  }

  /**
   * Filter transient/noise content
   * @param {Array} atoms - Atoms to filter
   * @returns {Array} Filtered atoms
   */
  filterTransient(atoms) {
    if (!this.#filter) throw new Error('Not initialized');
    const json = ffi.transient_filter_apply(this.#filter, JSON.stringify(atoms));
    return JSON.parse(json);
  }
}

// Export singleton instance
export const anchor = new AnchorCore();

// Export low-level FFI for advanced users
export { ffi };
