/**
 * PGlite Database Tests
 * 
 * Tests the core database functionality using PGlite.
 */

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';

describe('PGlite Database', () => {
  let db: PGlite;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique temp database path for each test
    testDbPath = path.join(process.cwd(), 'test-db-' + Date.now());
    
    // Clean up if exists
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
    
    // Initialize fresh database
    db = new PGlite(testDbPath);
    await db.waitReady;
    
    // Create required tables
    await db.run(`
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
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS molecules (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        compound_id TEXT,
        tags JSONB,
        start_byte BIGINT,
        end_byte BIGINT
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS compounds (
        id TEXT PRIMARY KEY,
        compound_body TEXT,
        path TEXT,
        molecular_signature TEXT
      )
    `);
    
    await db.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        atom_id TEXT REFERENCES atoms(id),
        tag TEXT NOT NULL
      )
    `);
  });

  afterAll(async () => {
    // Cleanup
    if (db) {
      await db.close();
    }
    if (testDbPath && fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      expect(db).toBeDefined();
    });

    test('should have required tables', async () => {
      const result = await db.run(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      const tables = result.rows.map((r: any) => r.table_name);
      expect(tables).toContain('atoms');
      expect(tables).toContain('molecules');
      expect(tables).toContain('compounds');
      expect(tables).toContain('tags');
    });
  });

  describe('transaction support', () => {
    test('should execute transaction successfully', async () => {
      let transactionExecuted = false;
      
      await db.transaction(async (tx) => {
        transactionExecuted = true;
        await tx.run('SELECT 1');
      });
      
      expect(transactionExecuted).toBe(true);
    });

    test('should rollback on error', async () => {
      let errorCaught = false;
      
      try {
        await db.transaction(async (tx) => {
          await tx.run('SELECT 1');
          throw new Error('Test error');
        });
      } catch (e: any) {
        errorCaught = true;
        expect(e.message).toBe('Test error');
      }
      
      expect(errorCaught).toBe(true);
    });
  });

  describe('basic operations', () => {
    test('should insert and query atoms', async () => {
      await db.run(`
        INSERT INTO atoms (id, content, source_path, timestamp, tags)
        VALUES ($1, $2, $3, $4, $5)
      `, ['test-atom-1', 'Test content', 'test.txt', Date.now(), '["#test"]']);

      const result = await db.run('SELECT id, content FROM atoms WHERE id = $1', ['test-atom-1']);
      
      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe('test-atom-1');
      expect(result.rows[0].content).toBe('Test content');
    });

    test('should handle batch inserts', async () => {
      const atoms = [
        ['batch-1', 'Content 1', 'test.txt', Date.now()],
        ['batch-2', 'Content 2', 'test.txt', Date.now()],
        ['batch-3', 'Content 3', 'test.txt', Date.now()],
      ];

      await db.transaction(async (tx) => {
        for (const [id, content, path, ts] of atoms) {
          await tx.run(
            'INSERT INTO atoms (id, content, source_path, timestamp) VALUES ($1, $2, $3, $4)',
            [id, content, path, ts]
          );
        }
      });

      const result = await db.run('SELECT COUNT(*) as count FROM atoms WHERE id LIKE $1', ['batch-%']);
      expect(parseInt((result.rows[0] as any).count)).toBe(3);
    });

    test('should handle JSONB tags', async () => {
      await db.run(`
        INSERT INTO atoms (id, content, source_path, timestamp, tags)
        VALUES ($1, $2, $3, $4, $5)
      `, ['tag-test', 'Content', 'test.txt', Date.now(), '["#tag1", "#tag2"]']);

      const result = await db.run('SELECT tags FROM atoms WHERE id = $1', ['tag-test']);
      const tags = JSON.parse(result.rows[0].tags as string);
      
      expect(tags).toContain('#tag1');
      expect(tags).toContain('#tag2');
    });
  });

  describe('cleanup', () => {
    test('should wipe data when truncated', async () => {
      await db.run(`
        INSERT INTO atoms (id, content, source_path, timestamp)
        VALUES ($1, $2, $3, $4)
      `, ['pre-wipe-atom', 'Should be wiped', 'test.txt', Date.now()]);

      const beforeWipe = await db.run('SELECT id FROM atoms WHERE id = $1', ['pre-wipe-atom']);
      expect(beforeWipe.rows.length).toBe(1);

      await db.run('TRUNCATE atoms');

      const afterWipe = await db.run('SELECT id FROM atoms WHERE id = $1', ['pre-wipe-atom']);
      expect(afterWipe.rows.length).toBe(0);
    });
  });
});
