/**
 * FFI Bindings for Anchor Core C++ Library using Koffi
 * 
 * Koffi is a modern, fast FFI library for Node.js that works without native compilation
 * 
 * Usage:
 *   import { anchor } from './core/anchor-core-ffi.js';
 *   await anchor.init();
 *   const results = anchor.search('query');
 */

import koffi from 'koffi';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find the DLL
const DLL_PATH = path.join(__dirname, '../../cpp/build/Release/anchor_core.dll');

console.log('[FFI] Loading Anchor Core library from:', DLL_PATH);

if (!existsSync(DLL_PATH)) {
  console.error('[FFI] DLL not found:', DLL_PATH);
  console.error('[FFI] Please build with: cd cpp && .\\build.bat --with-napi');
  throw new Error('Anchor Core DLL not found');
}

// Load the library
const lib = koffi.load(DLL_PATH);

// Define function signatures
const database_create = lib.func('database_create', 'void', ['string']);
const database_destroy = lib.func('database_destroy', 'void', ['void']);
const database_search_atoms = lib.func('database_search_atoms', 'string', ['void', 'string', 'int64']);
const database_get_stats = lib.func('database_get_stats', 'string', ['void']);
const database_insert_atom = lib.func('database_insert_atom', 'int64', ['void', 'string', 'string', 'int64', 'int64', 'double', 'uint64']);

const physics_walker_create = lib.func('physics_walker_create', 'void', ['double', 'double', 'int64']);
const physics_walker_destroy = lib.func('physics_walker_destroy', 'void', ['void']);
const physics_walker_radial_inflation = lib.func('physics_walker_radial_inflation', 'string', ['void', 'void', 'string', 'int64', 'double']);

const context_inflator_create = lib.func('context_inflator_create', 'void', ['int64', 'bool']);
const context_inflator_destroy = lib.func('context_inflator_destroy', 'void', ['void']);
const context_inflator_inflate = lib.func('context_inflator_inflate', 'string', ['void', 'void', 'string', 'int64']);

const deduplicator_create = lib.func('deduplicator_create', 'void', ['double', 'int64']);
const deduplicator_destroy = lib.func('deduplicator_destroy', 'void', ['void']);
const deduplicator_deduplicate = lib.func('deduplicator_deduplicate', 'string', ['void', 'string']);

const transient_filter_create = lib.func('transient_filter_create', 'void', ['int64', 'bool']);
const transient_filter_destroy = lib.func('transient_filter_destroy', 'void', ['void']);
const transient_filter_apply = lib.func('transient_filter_apply', 'string', ['void', 'string']);

console.log('[FFI] Anchor Core library loaded successfully');

/**
 * High-level wrapper for Anchor Core FFI
 */
export class AnchorCoreFFI {
  private db: any = null;
  private walker: any = null;
  private inflator: any = null;
  private dedup: any = null;
  private filter: any = null;

  /**
   * Initialize Anchor Core
   */
  async init(dbPath?: string): Promise<void> {
    try {
      this.db = database_create(dbPath || ':memory:');
      console.log('[AnchorCore] Database initialized');
      
      // Initialize components with default configs
      this.walker = physics_walker_create(0.85, 0.0001, 3);
      this.inflator = context_inflator_create(205, true);
      this.dedup = deduplicator_create(0.5, 5);
      this.filter = transient_filter_create(20, false);
      
      console.log('[AnchorCore] All components initialized');
    } catch (error: any) {
      console.error('[AnchorCore] Initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    if (this.filter) transient_filter_destroy(this.filter);
    if (this.dedup) deduplicator_destroy(this.dedup);
    if (this.inflator) context_inflator_destroy(this.inflator);
    if (this.walker) physics_walker_destroy(this.walker);
    if (this.db) database_destroy(this.db);
    console.log('[AnchorCore] Resources cleaned up');
  }

  /**
   * Search atoms with FTS5
   */
  search(query: string, limit: number = 100): any[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const resultsJson = database_search_atoms(this.db, query, limit);
    return JSON.parse(resultsJson);
  }

  /**
   * Insert an atom
   */
  insertAtom(
    sourceId: string,
    content: string,
    charStart: number,
    charEnd: number,
    timestamp: number,
    simhash: bigint
  ): number {
    if (!this.db) throw new Error('Database not initialized');
    
    return database_insert_atom(
      this.db,
      sourceId,
      content,
      BigInt(charStart),
      BigInt(charEnd),
      timestamp,
      BigInt(simhash)
    );
  }

  /**
   * Get database statistics
   */
  getStats(): any {
    if (!this.db) throw new Error('Database not initialized');
    
    const statsJson = database_get_stats(this.db);
    return JSON.parse(statsJson);
  }

  /**
   * Perform radial inflation (graph traversal)
   */
  radialInflation(
    anchorIds: number[],
    limit: number = 150,
    threshold: number = 0.005
  ): any[] {
    if (!this.db || !this.walker) throw new Error('Components not initialized');
    
    const anchorIdsJson = JSON.stringify(anchorIds);
    const resultsJson = physics_walker_radial_inflation(
      this.walker,
      this.db,
      anchorIdsJson,
      limit,
      threshold
    );
    return JSON.parse(resultsJson);
  }

  /**
   * Inflate context (n-1, n+1 expansion)
   */
  inflateContext(atomIds: number[], maxChars: number = 65536): any[] {
    if (!this.db || !this.inflator) throw new Error('Components not initialized');
    
    const atomIdsJson = JSON.stringify(atomIds);
    const resultsJson = context_inflator_inflate(
      this.inflator,
      this.db,
      atomIdsJson,
      maxChars
    );
    return JSON.parse(resultsJson);
  }

  /**
   * Deduplicate candidates
   */
  deduplicate(candidates: any[]): any[] {
    if (!this.dedup) throw new Error('Deduplicator not initialized');
    
    const candidatesJson = JSON.stringify(candidates);
    const resultsJson = deduplicator_deduplicate(
      this.dedup,
      candidatesJson
    );
    return JSON.parse(resultsJson);
  }

  /**
   * Filter transient content
   */
  filterTransient(atoms: any[]): any[] {
    if (!this.filter) throw new Error('TransientFilter not initialized');
    
    const atomsJson = JSON.stringify(atoms);
    const resultsJson = transient_filter_apply(
      this.filter,
      atomsJson
    );
    return JSON.parse(resultsJson);
  }
}

// Export singleton instance
export const anchor = new AnchorCoreFFI();
