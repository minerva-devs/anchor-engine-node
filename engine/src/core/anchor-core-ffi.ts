/**
 * FFI Bindings for Anchor Core C++ Library
 * 
 * Direct DLL loading using ffi-napi for high-performance C++ core access
 * without requiring full N-API compilation with V8 headers.
 * 
 * Prerequisites:
 *   npm install ffi-napi ref-napi ref-struct-napi
 * 
 * Usage:
 *   import { anchorCore } from './core/anchor-core-ffi.js';
 *   const db = anchorCore.createDatabase('./context.db');
 *   const results = anchorCore.searchAtoms(db, 'query', 100);
 */

import ffi from 'ffi-napi';
import ref from 'ref-napi';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
const voidPtr = ref.types.void;
const int64 = ref.types.int64;
const uint64 = ref.types.uint64;
const double = ref.types.double;
const string = ref.types.CString;
const bool = ref.types.bool;

// Load the compiled C++ library
const LIB_PATH = path.join(__dirname, '../../cpp/build/Release/anchor_core.dll');

console.log('[FFI] Loading Anchor Core library from:', LIB_PATH);

export const anchorCore = ffi.Library(LIB_PATH, {
  // Database operations
  'database_create': [voidPtr, [string]],
  'database_destroy': [void, [voidPtr]],
  'database_open': [bool, [voidPtr, string]],
  'database_close': [void, [voidPtr]],
  'database_search_atoms': [string, [voidPtr, string, int64]],
  'database_get_stats': [string, [voidPtr]],
  'database_insert_atom': [int64, [voidPtr, string, string, int64, int64, double, uint64]],
  
  // Physics Walker operations
  'physics_walker_create': [voidPtr, [double, double, int64]],
  'physics_walker_destroy': [void, [voidPtr]],
  'physics_walker_radial_inflation': [string, [voidPtr, voidPtr, string, int64, double]],
  
  // Context Inflator operations
  'context_inflator_create': [voidPtr, [int64, bool]],
  'context_inflator_destroy': [void, [voidPtr]],
  'context_inflator_inflate': [string, [voidPtr, voidPtr, string, int64]],
  
  // Deduplicator operations
  'deduplicator_create': [voidPtr, [double, int64]],
  'deduplicator_destroy': [void, [voidPtr]],
  'deduplicator_deduplicate': [string, [voidPtr, string]],
  
  // Transient Filter operations
  'transient_filter_create': [voidPtr, [int64]],
  'transient_filter_destroy': [void, [voidPtr]],
  'transient_filter_apply': [string, [voidPtr, string]]
});

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
      this.db = anchorCore.database_create(dbPath || ':memory:');
      console.log('[AnchorCore] Database initialized');
      
      // Initialize components with default configs
      this.walker = anchorCore.physics_walker_create(0.85, 0.0001, 3);
      this.inflator = anchorCore.context_inflator_create(205, true);
      this.dedup = anchorCore.deduplicator_create(0.5, 5);
      this.filter = anchorCore.transient_filter_create(20);
      
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
    if (this.filter) anchorCore.transient_filter_destroy(this.filter);
    if (this.dedup) anchorCore.deduplicator_destroy(this.dedup);
    if (this.inflator) anchorCore.context_inflator_destroy(this.inflator);
    if (this.walker) anchorCore.physics_walker_destroy(this.walker);
    if (this.db) anchorCore.database_destroy(this.db);
    console.log('[AnchorCore] Resources cleaned up');
  }

  /**
   * Search atoms with FTS5
   */
  search(query: string, limit: number = 100): any[] {
    if (!this.db) throw new Error('Database not initialized');
    
    const resultsJson = anchorCore.database_search_atoms(this.db, query, limit);
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
    
    return anchorCore.database_insert_atom(
      this.db,
      sourceId,
      content,
      charStart,
      charEnd,
      timestamp,
      simhash
    );
  }

  /**
   * Get database statistics
   */
  getStats(): any {
    if (!this.db) throw new Error('Database not initialized');
    
    const statsJson = anchorCore.database_get_stats(this.db);
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
    const resultsJson = anchorCore.physics_walker_radial_inflation(
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
    const resultsJson = anchorCore.context_inflator_inflate(
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
    const resultsJson = anchorCore.deduplicator_deduplicate(
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
    const resultsJson = anchorCore.transient_filter_apply(
      this.filter,
      atomsJson
    );
    return JSON.parse(resultsJson);
  }
}

// Export singleton instance
export const anchor = new AnchorCoreFFI();
