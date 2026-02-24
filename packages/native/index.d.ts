/**
 * Type definitions for @anchor-engine/native
 */

export interface Atom {
  id: string;
  source_id: string;
  content: string;
  char_start: number;
  char_end: number;
  timestamp: number;
  simhash: bigint;
  tags?: string[];
  buckets?: string[];
}

export interface DatabaseStats {
  atom_count: number;
  source_count: number;
  tag_count: number;
}

export interface Candidate {
  atom_id: string;
  score: number;
  shared_tags: number;
  hop_distance: number;
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
   * Search atoms
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
