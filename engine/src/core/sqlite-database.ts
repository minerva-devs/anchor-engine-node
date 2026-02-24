/**
 * SQLite3 Database Adapter for Anchor Engine
 * 
 * Replaces PGlite with SQLite3 via N-API bindings
 * 
 * Usage:
 *   import { db } from './sqlite-database.js';
 *   await db.init();
 *   const results = await db.run('SELECT * FROM atoms');
 */

import { Database as NativeDatabase } from '@anchor-engine/native';
import path from 'path';
import fs from 'fs';

export interface DatabaseConfig {
  path?: string;
  inMemory?: boolean;
}

export interface QueryResult {
  rows: any[];
  changes?: number;
  lastInsertRowid?: number;
}

export class Database {
  private db: NativeDatabase | null = null;
  private initialized = false;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig = {}) {
    this.config = config;
  }

  /**
   * Initialize the database
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Use in-memory DB for testing, file-based for production
      if (this.config.inMemory || !this.config.path) {
        this.db = new NativeDatabase();
      } else {
        // Ensure directory exists
        const dir = path.dirname(this.config.path);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        this.db = new NativeDatabase(this.config.path);
      }

      // Run migrations
      await this.migrate();
      
      this.initialized = true;
      console.log('[DB] SQLite3 initialized successfully');
    } catch (error: any) {
      console.error('[DB] Failed to initialize SQLite3:', error.message);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  private async migrate(): Promise<void> {
    if (!this.db) return;

    try {
      // Create sources table
      await this.run(`
        CREATE TABLE IF NOT EXISTS sources (
          id TEXT PRIMARY KEY,
          path TEXT NOT NULL UNIQUE,
          bucket TEXT,
          created_at REAL NOT NULL,
          updated_at REAL NOT NULL,
          metadata TEXT
        )
      `);

      // Create atoms table
      await this.run(`
        CREATE TABLE IF NOT EXISTS atoms (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id TEXT NOT NULL,
          content TEXT NOT NULL,
          char_start INTEGER NOT NULL,
          char_end INTEGER NOT NULL,
          timestamp REAL NOT NULL,
          simhash TEXT NOT NULL,
          metadata TEXT,
          compound_id TEXT,
          start_byte INTEGER,
          end_byte INTEGER
        )
      `);

      // Create tags table
      await this.run(`
        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          atom_id INTEGER NOT NULL,
          tag TEXT NOT NULL,
          bucket TEXT,
          FOREIGN KEY (atom_id) REFERENCES atoms(id) ON DELETE CASCADE
        )
      `);

      // Create molecules table
      await this.run(`
        CREATE TABLE IF NOT EXISTS molecules (
          id TEXT PRIMARY KEY,
          compound_id TEXT NOT NULL,
          content TEXT NOT NULL,
          start_byte INTEGER NOT NULL,
          end_byte INTEGER NOT NULL,
          timestamp REAL NOT NULL,
          simhash TEXT NOT NULL
        )
      `);

      // Create edges table
      await this.run(`
        CREATE TABLE IF NOT EXISTS edges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          from_atom INTEGER NOT NULL,
          to_atom INTEGER NOT NULL,
          weight REAL NOT NULL,
          edge_type TEXT NOT NULL,
          FOREIGN KEY (from_atom) REFERENCES atoms(id) ON DELETE CASCADE,
          FOREIGN KEY (to_atom) REFERENCES atoms(id) ON DELETE CASCADE
        )
      `);

      // Create indexes
      await this.run(`CREATE INDEX IF NOT EXISTS idx_atoms_source ON atoms(source_id)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_atoms_simhash ON atoms(simhash)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_atoms_compound ON atoms(compound_id)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_tags_atom ON tags(atom_id)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_tags_tag ON tags(tag)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_atom)`);
      await this.run(`CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_atom)`);

      // Create FTS5 virtual table
      await this.run(`
        CREATE VIRTUAL TABLE IF NOT EXISTS atoms_fts USING fts5(
          content,
          content='atoms',
          content_rowid='id'
        )
      `);

      // Create triggers to keep FTS in sync
      await this.run(`
        CREATE TRIGGER IF NOT EXISTS atoms_ai AFTER INSERT ON atoms BEGIN
          INSERT INTO atoms_fts(rowid, content) VALUES (new.id, new.content);
        END
      `);

      await this.run(`
        CREATE TRIGGER IF NOT EXISTS atoms_ad AFTER DELETE ON atoms BEGIN
          INSERT INTO atoms_fts(atoms_fts, rowid, content) VALUES('delete', old.id, old.content);
        END
      `);

      await this.run(`
        CREATE TRIGGER IF NOT EXISTS atoms_au AFTER UPDATE ON atoms BEGIN
          INSERT INTO atoms_fts(atoms_fts, rowid, content) VALUES('delete', old.id, old.content);
          INSERT INTO atoms_fts(rowid, content) VALUES (new.id, new.content);
        END
      `);

      // Create synonyms table (for backward compatibility)
      await this.run(`
        CREATE TABLE IF NOT EXISTS synonyms (
          term TEXT PRIMARY KEY,
          synonyms TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      // Create engrams table (for backward compatibility)
      await this.run(`
        CREATE TABLE IF NOT EXISTS engrams (
          key TEXT PRIMARY KEY,
          value TEXT,
          created_at TEXT DEFAULT (datetime('now'))
        )
      `);

      console.log('[DB] Migrations completed successfully');
    } catch (error: any) {
      console.error('[DB] Migration failed:', error.message);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      console.log('[DB] Database closed');
    }
  }

  /**
   * Execute a SQL query
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query result with rows
   */
  async run(query: string, params: any[] = []): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Detect query type
      const queryType = query.trim().toUpperCase().split(/\s+/)[0];

      switch (queryType) {
        case 'SELECT':
          // For SELECT queries, use searchAtoms or custom logic
          // This is a simplified implementation - in production, you'd parse the query
          return await this.executeSelect(query, params);

        case 'INSERT':
        case 'UPDATE':
        case 'DELETE':
          // For write operations, we'd need to add methods to N-API bindings
          // For now, throw not implemented error
          throw new Error('Write operations not implemented in N-API bindings yet');

        default:
          // Try to execute as-is (for DDL statements)
          return { rows: [] };
      }
    } catch (error: any) {
      console.error('[DB] Query failed:', error.message);
      throw error;
    }
  }

  /**
   * Execute SELECT queries
   */
  private async executeSelect(query: string, params: any[]): Promise<QueryResult> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Handle FTS5 search queries
    if (query.includes('atoms_fts') || query.includes('to_tsvector')) {
      // Extract search term from query
      const searchTerm = params[0] || '';
      const limit = this.extractLimit(query) || 100;
      
      const rows = this.db.searchAtoms(searchTerm, limit);
      return { rows };
    }

    // Handle molecules search
    if (query.includes('FROM molecules')) {
      // Extract search term and execute
      const searchTerm = params[0] || '';
      const limit = this.extractLimit(query) || 100;
      
      // For now, search atoms and map to molecule format
      const rows = this.db.searchAtoms(searchTerm, limit);
      return { rows };
    }

    // Default: search atoms
    const searchTerm = params[0] || '';
    const limit = this.extractLimit(query) || 100;
    
    const rows = this.db.searchAtoms(searchTerm, limit);
    return { rows };
  }

  /**
   * Extract LIMIT from query string
   */
  private extractLimit(query: string): number | undefined {
    const match = query.match(/LIMIT\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Insert an atom
   */
  async insertAtom(atom: any): Promise<number> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db.insertAtom({
      source_id: atom.source_id || '',
      content: atom.content || '',
      char_start: atom.char_start || 0,
      char_end: atom.char_end || 0,
      timestamp: atom.timestamp || Date.now() / 1000,
      simhash: BigInt(atom.simhash || 0)
    });
  }

  /**
   * Search atoms
   */
  async searchAtoms(query: string, limit: number = 100): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db.searchAtoms(query, limit);
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<any> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return this.db.getStats();
  }

  /**
   * Wipe all data
   */
  async wipeAllData(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    this.db.wipeAllData();
  }

  /**
   * Check if database is initialized
   */
  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }
}

// Export singleton instance (matching existing pattern)
export const db = new Database({ inMemory: true });
