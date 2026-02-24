/**
 * SQLite3 Database Adapter for Anchor Engine
 * 
 * Replaces PGlite with SQLite3 via N-API bindings
 */

import { Database as NativeDatabase } from '@anchor-engine/native';

export interface DatabaseConfig {
  path?: string;
  inMemory?: boolean;
}

export class Database {
  private db: NativeDatabase;
  private initialized = false;

  constructor(config: DatabaseConfig = {}) {
    if (config.inMemory || !config.path) {
      this.db = new NativeDatabase();
    } else {
      this.db = new NativeDatabase(config.path);
    }
  }

  async init(): Promise<void> {
    // Database is already initialized in constructor
    this.initialized = true;
    console.log('[DB] SQLite3 initialized successfully');
  }

  async close(): Promise<void> {
    this.db.close();
    this.initialized = false;
  }

  async run(query: string, params: any[] = []): Promise<{ rows: any[] }> {
    // For raw SQL queries, we'd need to add a run() method to N-API bindings
    // For now, use the high-level API methods
    throw new Error('Raw SQL not supported, use high-level API methods');
  }

  async search(query: string, limit: number = 100): Promise<any[]> {
    return this.db.searchAtoms(query, limit);
  }

  async insertAtom(atom: any): Promise<number> {
    return this.db.insertAtom(atom);
  }

  async getStats(): Promise<any> {
    return this.db.getStats();
  }

  async wipeAllData(): Promise<void> {
    return this.db.wipeAllData();
  }

  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }
}

// Export singleton instance (matching existing pattern)
export const db = new Database({ inMemory: true });
