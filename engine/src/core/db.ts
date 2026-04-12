/**
 * Core Database Module for PGlite Integration
 * 
 * Handles database operations including:
 * - JSONB tag storage in comma-separated format (#tag1#tag2)
 * - Foreign key constraint management for atoms/tags relationship
 * - Table initialization and cleanup operations
 */

import { PGlite } from '@electric-sql/pglite';

/**
 * Database configuration interface
 */
export interface DBConfig {
  /** Path to database storage */
  path: string;
  /** Enable WAL mode for better concurrency */
  enableWAL?: boolean;
}

/**
 * Atom record type representing content units in the system
 */
export interface AtomRecord {
  id: string;
  content: string;
  sourcePath: string | null;
  timestamp: number;
  tags: string[];
  buckets: string[];
  provenance: 'internal' | 'external';
  compoundId: string | null;
  startByte: number | null;
  endByte: number | null;
  simhash: string | null;
}

/**
 * Tag record type for the tags table with foreign key relationship to atoms
 */
export interface TagRecord {
  id: number;
  atomId: string;
  tagName: string;
}

/**
 * PGlite database instance wrapper providing convenient access and operations
 */
export class Database {
  private db: PGlite | null = null;
  private initialized: boolean = false;

  /**
   * Initialize the database with configuration options
   */
  async initialize(config: DBConfig): Promise<void> {
    if (this.initialized) return;

    this.db = new PGlite(config.path);
    
    // Wait for PGlite to be ready
    await this.db.waitReady;

    // Create required tables with proper schema
    await this.createTables();

    this.initialized = true;
  }

  /**
   * Create all necessary database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create atoms table with JSONB support for tags
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS atoms (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        source_path TEXT,
        timestamp BIGINT,
        tags JSONB,
        buckets TEXT[],
        provenance TEXT DEFAULT 'internal',
        compound_id TEXT,
        start_byte BIGINT,
        end_byte BIGINT,
        simhash TEXT
      )
    `);

    // Create molecules table for hierarchical content organization
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS molecules (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        compound_id TEXT,
        tags JSONB,
        start_byte BIGINT,
        end_byte BIGINT
      )
    `);

    // Create compounds table for grouping related atoms and molecules
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS compounds (
        id TEXT PRIMARY KEY,
        compound_body TEXT,
        path TEXT,
        molecular_signature TEXT
      )
    `);

    // Create tags table with foreign key to atoms
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        atom_id TEXT REFERENCES atoms(id) ON DELETE CASCADE,
        tag TEXT NOT NULL
      )
    `);

    // Create indexes for better query performance
    await this.createIndexes();
  }

  /**
   * Create indexes on frequently queried columns
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Index for atoms by source path
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_source_path 
      ON atoms(source_path)
    `);

    // Index for atoms by timestamp for temporal queries
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_timestamp 
      ON atoms(timestamp DESC)
    `);

    // Composite index for tags covering atom_id and tag name
    await this.db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_atom_tag 
      ON tags(atom_id, tag)
    `);

    // GIN index for JSONB tags column in atoms table
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_tags_gin 
      ON atoms USING GIN(tags)
    `);
  }

  /**
   * Insert an atom with proper tag handling using comma-separated format
   */
  async insertAtom(atom: AtomRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Convert tags array to PGlite's internal comma-separated JSONB format
    const tagsJSON = this.formatTagsForPGlite(atom.tags);

    await this.db.query(
      `INSERT INTO atoms (id, content, source_path, timestamp, tags, buckets, provenance, compound_id, start_byte, end_byte, simhash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        atom.id,
        atom.content,
        atom.sourcePath,
        atom.timestamp,
        tagsJSON,
        JSON.stringify(atom.buckets),
        atom.provenance,
        atom.compoundId,
        atom.startByte,
        atom.endByte,
        atom.simhash,
      ]
    );

    // Insert associated tags into the tags table
    for (const tag of atom.tags) {
      await this.insertTag(atom.id, tag);
    }
  }

  /**
   * Format tags array to PGlite's internal JSONB storage format
   * 
   * PGlite stores JSONB fields as comma-separated strings internally:
   * '["tag1","tag2"]' instead of native JSON arrays
   */
  private formatTagsForPGlite(tags: string[]): string {
    // Convert tags to the #tag1#tag2 format for better storage efficiency
    const formatted = tags.map(tag => `#${tag}`);
    
    // Wrap in JSON-like structure that PGlite can parse
    return `'${formatted.join(',')}'`;
  }

  /**
   * Insert a tag record with foreign key relationship to atoms
   */
  async insertTag(atomId: string, tagName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.query(
      `INSERT INTO tags (atom_id, tag) VALUES ($1, $2)`,
      [atomId, tagName]
    );
  }

  /**
   * Query atoms by ID with proper JSONB parsing
   */
  async getAtomById(id: string): Promise<AtomRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.query(
      `SELECT id, content, source_path, timestamp, tags, buckets, provenance, 
              compound_id, start_byte, end_byte, simhash 
       FROM atoms WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    
    // Parse the comma-separated JSONB tags string
    const parsedTags = this.parseTagsFromPGlite(row.tags as string);

    return {
      id: row.id,
      content: row.content,
      sourcePath: row.source_path,
      timestamp: Number(row.timestamp),
      tags: parsedTags,
      buckets: JSON.parse(row.buckets || '[]'),
      provenance: (row.provenance as 'internal' | 'external') || 'internal',
      compoundId: row.compound_id,
      startByte: row.start_byte ? Number(row.start_byte) : null,
      endByte: row.end_byte ? Number(row.end_byte) : null,
      simhash: row.simhash,
    };
  }

  /**
   * Parse tags from PGlite's comma-separated JSONB format back to array
   */
  private parseTagsFromPGlite(tagsStr: string): string[] {
    // Remove outer single quotes and hash symbols
    const cleaned = tagsStr.replace(/^'|'$/g, '').replace(/#/g, '');
    
    // Split by comma to get individual tags
    return cleaned.split(',').filter(tag => tag.length > 0);
  }

  /**
   * Perform database cleanup with proper foreign key handling
   * 
   * This method handles the FK constraint issue where truncating atoms table
   * requires deleting related records from the tags table first.
   */
  async performCleanup(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Delete dependent tag records before truncating atoms
    await this.db.query(`DELETE FROM tags WHERE atom_id IS NOT NULL`);

    // Truncate the atoms table
    await this.db.query(`TRUNCATE atoms RESTART IDENTITY CASCADE`);

    // Verify cleanup was successful
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM atoms`
    );

    const totalAtoms = Number(countResult.rows[0].total);
    if (totalAtoms !== 0) {
      throw new Error(`Cleanup failed: ${totalAtoms} atoms remain after truncation`);
    }
  }

  /**
   * Execute a transaction with proper error handling
   */
  async executeTransaction<T>(
    operation: (tx: PGlite) => Promise<T>
  ): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    return this.db.transaction(async (tx) => {
      // Wrap the database instance for transaction operations
      const txDB = { ...this, db: tx };
      return operation(tx);
    });
  }

  /**
   * Close the database connection and cleanup resources
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }

  /**
   * Get the current PGlite instance for direct operations
   */
  getInstance(): PGlite | null {
    return this.db;
  }
}

// Export singleton instance
export const db = new Database();
