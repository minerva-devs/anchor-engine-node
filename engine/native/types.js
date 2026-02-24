/**
 * Type definitions for @rbalchii/anchor-core
 */

export interface Atom {
  id: number;
  source_id: string;
  content: string;
  char_start: number;
  char_end: number;
  timestamp: number;
  simhash: bigint;
  tags?: string[];
  buckets?: string[];
  compound_id?: string;
  start_byte?: number;
  end_byte?: number;
}

export interface Candidate {
  atom_id: number;
  score: number;
  shared_tags: number;
  hop_distance: number;
  simhash?: bigint;
  temporal_decay?: number;
}

export interface DatabaseStats {
  atom_count: number;
  source_count: number;
  tag_count: number;
}

export interface SearchOptions {
  limit?: number;
  buckets?: string[];
  tags?: string[];
  provenance?: 'internal' | 'external' | 'quarantine' | 'all';
}

export interface PhysicsWalkerConfig {
  damping?: number;
  temporalDecay?: number;
  walkRadius?: number;
  gravityThreshold?: number;
}

export interface ContextInflatorConfig {
  baseRadius?: number;
  expandToParagraphs?: boolean;
  maxChars?: number;
}

export class AnchorCore {
  /**
   * Initialize database
   */
  init(dbPath?: string): void;
  
  /**
   * Cleanup resources
   */
  destroy(): void;
  
  /**
   * Search atoms with FTS5
   */
  search(query: string, limit?: number): Atom[];
  
  /**
   * Get database statistics
   */
  getStats(): DatabaseStats;
  
  /**
   * Insert atom
   */
  insertAtom(
    sourceId: string,
    content: string,
    charStart: number,
    charEnd: number,
    timestamp: number,
    simhash: bigint
  ): number;
  
  /**
   * Perform graph traversal
   */
  radialInflation(
    anchorIds: number[],
    limit?: number,
    threshold?: number
  ): Candidate[];
  
  /**
   * Inflate context
   */
  inflateContext(
    atomIds: number[],
    maxChars?: number
  ): Atom[];
  
  /**
   * Deduplicate results
   */
  deduplicate(candidates: Candidate[]): Candidate[];
  
  /**
   * Filter transient content
   */
  filterTransient(atoms: Atom[]): Atom[];
}

export const anchor: AnchorCore;
