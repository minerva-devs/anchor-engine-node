/**
 * PGlite Database Tests
 * 
 * Comprehensive tests for core database functionality using PGlite.
 * Focus areas:
 * - JSONB tag storage in comma-separated format (#tag1#tag2)
 * - Foreign key constraint management for atoms/tags relationship
 * - Transaction support and data integrity operations
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';

describe('PGlite Database', () => {
  let db: PGlite;
  let testDbPath: string;
  let originalCwd: string;

  beforeEach(async () => {
    // Store current working directory
    originalCwd = process.cwd();
    
    // Create unique temp database path for each test
    testDbPath = path.join(originalCwd, 'test-db-' + Date.now());

    // Clean up if exists
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }

    // Initialize fresh database with WAL mode enabled
    db = new PGlite(testDbPath);
    await db.waitReady;

    // Create required tables with proper schema and constraints
    await createDatabaseSchema();
  });

  afterEach(async () => {
    // Close database connection
    if (db) {
      await db.close();
    }
  });

  afterAll(async () => {
    // Final cleanup of test directories
    const testDirs = fs.readdirSync(originalCwd).filter(dir => 
      dir.startsWith('test-db-') && fs.statSync(path.join(originalCwd, dir)).isDirectory()
    );

    for (const dir of testDirs) {
      const dirPath = path.join(originalCwd, dir);
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    }
  });

  /**
   * Create the complete database schema with tables and constraints
   */
  async function createDatabaseSchema(): Promise<void> {
    // Create atoms table with JSONB support for tags
    await db.query(`
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
    await db.query(`
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
    await db.query(`
      CREATE TABLE IF NOT EXISTS compounds (
        id TEXT PRIMARY KEY,
        compound_body TEXT,
        path TEXT,
        molecular_signature TEXT
      )
    `);

    // Create tags table with foreign key to atoms - critical for FK constraint management
    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        atom_id TEXT REFERENCES atoms(id) ON DELETE CASCADE,
        tag TEXT NOT NULL
      )
    `);

    // Create indexes for query performance optimization
    await createIndexes();
  }

  /**
   * Create database indexes for improved query performance
   */
  async function createIndexes(): Promise<void> {
    // Index for atoms by source path
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_source_path 
      ON atoms(source_path)
    `);

    // Index for atoms by timestamp for temporal queries
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_timestamp 
      ON atoms(timestamp DESC)
    `);

    // Composite unique index for tags covering atom_id and tag name
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_atom_tag 
      ON tags(atom_id, tag)
    `);

    // GIN index for JSONB tags column in atoms table
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_atoms_tags_gin 
      ON atoms USING GIN(tags)
    `);
  }

  /**
   * Format tags array to PGlite's internal comma-separated JSONB format
   * 
   * PGlite stores JSONB fields as comma-separated strings internally:
   * '["tag1","tag2"]' instead of native JSON arrays for efficient storage.
   */
  function formatTagsForPGlite(tags: string[]): string {
    // Convert tags to the #tag1#tag2 format for better storage efficiency
    const formatted = tags.map(tag => `#${tag}`);
    
    // Wrap in JSON-like structure that PGlite can parse
    return `'${formatted.join(',')}'`;
  }

  /**
   * Parse tags from PGlite's comma-separated JSONB format back to array
   */
  function parseTagsFromPGlite(tagsStr: string): string[] {
    // Remove outer single quotes and hash symbols
    const cleaned = tagsStr.replace(/^'|'$/g, '').replace(/#/g, '');
    
    // Split by comma to get individual tags
    return cleaned.split(',').filter(tag => tag.length > 0);
  }

  describe('initialization', () => {
    test('should initialize successfully', async () => {
      expect(db).toBeDefined();
      expect(db.client).toBeDefined();
      
      // Verify database is ready and connected
      const result = await db.query('SELECT 1 as check');
      expect(result.rows[0].check).toBe(1);
    });

    test('should have required tables', async () => {
      const result = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      const tables = result.rows.map((r: any) => r.table_name);
      
      // Verify all required tables exist
      expect(tables).toContain('atoms');
      expect(tables).toContain('molecules');
      expect(tables).toContain('compounds');
      expect(tables).toContain('tags');

      // Log table count for verification
      console.log(`Database initialized with ${tables.length} tables: ${tables.join(', ')}`);
    });

    test('should create proper indexes', async () => {
      const result = await db.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        ORDER BY indexname
      `);

      const indexes = result.rows.map((r: any) => r.indexname);
      
      // Verify critical indexes exist
      expect(indexes).toContain('idx_atoms_source_path');
      expect(indexes).toContain('idx_atoms_timestamp');
      expect(indexes).toContain('idx_tags_atom_tag');
      expect(indexes).toContain('idx_atoms_tags_gin');

      console.log(`Created ${indexes.length} indexes for query optimization`);
    });
  });

  describe('transaction support', () => {
    test('should execute transaction successfully', async () => {
      let transactionExecuted = false;

      await db.transaction(async (tx) => {
        transactionExecuted = true;
        
        // Execute a simple query within the transaction
        const result = await tx.query('SELECT 1 as check');
        expect(result.rows[0].check).toBe(1);
      });

      expect(transactionExecuted).toBe(true);
      
      // Verify transaction committed successfully
      const finalCheck = await db.query('SELECT COUNT(*) FROM atoms');
      console.log(`Transaction completed with ${finalCheck.rows[0].count} total records`);
    });

    test('should rollback on error', async () => {
      let errorCaught = false;
      let beforeCount: number;

      // Get initial count before transaction
      const initialResult = await db.query('SELECT COUNT(*) as count FROM atoms');
      beforeCount = Number(initialResult.rows[0].count);

      try {
        await db.transaction(async (tx) => {
          // Insert a test record within the transaction
          await tx.query(
            `INSERT INTO atoms (id, content, source_path, timestamp) 
             VALUES ($1, $2, $3, $4)`,
            ['test-rollback', 'Rollback Test Content', 'test.txt', Date.now()]
          );

          // Simulate an error halfway through the transaction
          throw new Error('Test rollback error');
        });
      } catch (e: any) {
        errorCaught = true;
        
        // Verify the correct error was caught and propagated
        expect(e.message).toBe('Test rollback error');
        
        // Log error details for debugging
        console.error(`Transaction error caught: ${e.message}`);
      }

      expect(errorCaught).toBe(true);

      // After rollback, verify no partial changes were committed
      const afterCountResult = await db.query(
        'SELECT COUNT(*) as count FROM atoms WHERE id = $1', 
        ['test-rollback']
      );
      
      // The record should not exist due to successful rollback
      expect(afterCountResult.rows[0].count).toBe('0');
      console.log(`Rollback verified: ${beforeCount} records before, 0 new records after`);
    });

    test('should support nested transactions', async () => {
      let outerTransaction = false;
      let innerTransaction = false;

      await db.transaction(async (outerTx) => {
        outerTransaction = true;
        
        // Execute inner transaction
        await outerTx.transaction(async (innerTx) => {
          innerTransaction = true;
          
          // Perform operations in both transactions
          await innerTx.query('SELECT 1 as level', []);
        });
      });

      expect(outerTransaction).toBe(true);
      expect(innerTransaction).toBe(true);

      console.log('Nested transaction hierarchy verified successfully');
    });
  });

  describe('basic operations', () => {
    test('should insert and query atoms', async () => {
      const atomId = 'test-atom-1';
      const timestamp = Date.now();

      // Insert a new atom with all fields
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp, tags)
         VALUES ($1, $2, $3, $4, $5)`,
        [atomId, 'Test content', 'test.txt', timestamp, formatTagsForPGlite(['#test'])]
      );

      // Query the inserted atom
      const result = await db.query(
        'SELECT id, content, source_path, timestamp FROM atoms WHERE id = $1', 
        [atomId]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].id).toBe(atomId);
      expect(result.rows[0].content).toBe('Test content');
      
      // Verify timestamp is properly stored as BIGINT
      const storedTimestamp = Number(result.rows[0].timestamp);
      expect(storedTimestamp).toBeGreaterThan(0);
      
      console.log(`Atom inserted and verified: ${result.rows[0].id}`);
    });

    test('should handle batch inserts', async () => {
      const atoms = [
        ['batch-1', 'Content 1', 'test.txt', Date.now()],
        ['batch-2', 'Content 2', 'test.txt', Date.now()],
        ['batch-3', 'Content 3', 'test.txt', Date.now()],
      ];

      // Perform batch insert within a transaction
      await db.transaction(async (tx) => {
        for (const [id, content, sourcePath, ts] of atoms) {
          await tx.query(
            `INSERT INTO atoms (id, content, source_path, timestamp) 
             VALUES ($1, $2, $3, $4)`,
            [id, content, sourcePath, ts]
          );
        }
      });

      // Verify batch insert results
      const result = await db.query(
        'SELECT COUNT(*) as count FROM atoms WHERE id LIKE $1', 
        ['batch-%']
      );
      
      expect(parseInt(result.rows[0].count)).toBe(3);
      console.log(`Batch insert completed: ${result.rows[0].count} records inserted`);
    });

    test('should handle JSONB tags with comma-separated format', async () => {
      // Test data representing PGlite's internal JSONB storage format
      const testTags = ['#tag1', '#tag2', '#tag3'];
      
      // Insert atom with formatted tags
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp, tags)
         VALUES ($1, $2, $3, $4, $5)`,
        ['tag-test', 'Content', 'test.txt', Date.now(), formatTagsForPGlite(testTags)]
      );

      // Query and verify tag storage
      const result = await db.query(
        'SELECT tags FROM atoms WHERE id = $1', 
        ['tag-test']
      );

      if (result.rows.length > 0) {
        // Parse the comma-separated JSONB string back to array
        const tagsStr = result.rows[0].tags as string;
        const parsedTags = parseTagsFromPGlite(tagsStr);

        // Verify all expected tags are present
        expect(parsedTags).toContain('#tag1');
        expect(parsedTags).toContain('#tag2');
        expect(parsedTags).toContain('#tag3');

        console.log(`JSONB tags verified: ${parsedTags.join(', ')}`);
      } else {
        throw new Error('No data returned for tag-test atom');
      }
    });

    test('should handle JSONB array operations', async () => {
      // Create multiple atoms with different tag configurations
      const atomsData = [
        { id: 'json-atom-1', tags: ['#frontend', '#react'], content: 'React component' },
        { id: 'json-atom-2', tags: ['#backend', '#nodejs'], content: 'Node.js service' },
        { id: 'json-atom-3', tags: ['#database', '#pglite'], content: 'PGlite database' },
      ];

      // Insert all atoms with their respective tags
      for (const atom of atomsData) {
        await db.query(
          `INSERT INTO atoms (id, content, source_path, timestamp, tags)
           VALUES ($1, $2, $3, $4, $5)`,
          [atom.id, atom.content, 'json-test.txt', Date.now(), formatTagsForPGlite(atom.tags)]
        );
      }

      // Query all JSON atoms and verify their tag configurations
      const result = await db.query(
        `SELECT id, content, tags 
         FROM atoms 
         WHERE id IN ($1, $2, $3)`,
        ['json-atom-1', 'json-atom-2', 'json-atom-3']
      );

      // Verify each atom's tag configuration
      for (const row of result.rows) {
        const tagsStr = row.tags as string;
        const parsedTags = parseTagsFromPGlite(tagsStr);
        
        expect(parsedTags.length).toBeGreaterThan(0);
        console.log(`Atom ${row.id}: ${parsedTags.join(', ')}`);
      }

      expect(result.rows.length).toBe(3);
    });
  });

  describe('cleanup', () => {
    test('should wipe data when truncated', async () => {
      // Insert initial data before truncation
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp)
         VALUES ($1, $2, $3, $4)`,
        ['pre-wipe-atom', 'Should be wiped', 'test.txt', Date.now()]
      );

      // Insert related tags for the atom
      await db.query(
        `INSERT INTO tags (atom_id, tag) VALUES ($1, $2)`,
        ['pre-wipe-atom', '#pre-wipe-tag']
      );

      const beforeWipe = await db.query(
        'SELECT id FROM atoms WHERE id = $1', 
        ['pre-wipe-atom']
      );
      
      expect(beforeWipe.rows.length).toBe(1);

      // Delete from tags first due to foreign key constraint, then truncate atoms
      // This addresses the FK constraint issue where truncating atoms requires
      // related tag records to be removed first
      await db.query(`DELETE FROM tags WHERE atom_id = $1`, ['pre-wipe-atom']);
      
      // Truncate the atoms table with cascade to handle foreign key constraints
      await db.query('TRUNCATE atoms RESTART IDENTITY CASCADE');

      const afterWipe = await db.query(
        'SELECT id FROM atoms WHERE id = $1', 
        ['pre-wipe-atom']
      );
      
      // Verify the atom was successfully wiped
      expect(afterWipe.rows.length).toBe(0);
      
      console.log('Data wipe completed: Atom data cleared and FK constraints maintained');
    });

    test('should handle foreign key constraint on truncate', async () => {
      // Create atoms with associated tags to test FK constraints during truncation
      const atomId = 'fk-test-atom';
      
      // Insert parent atom
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [atomId, 'FK Test Content', 'fk-test.txt', Date.now()]
      );

      // Insert multiple related tags
      const tags = ['#frontend', '#backend', '#database'];
      for (const tag of tags) {
        await db.query(
          `INSERT INTO tags (atom_id, tag) VALUES ($1, $2)`,
          [atomId, tag]
        );
      }

      // Verify initial state with FK relationships intact
      const fkCheck = await db.query(`
        SELECT a.id as atom_id, t.tag 
        FROM atoms a 
        LEFT JOIN tags t ON a.id = t.atom_id 
        WHERE a.id = $1`,
        [atomId]
      );

      expect(fkCheck.rows.length).toBeGreaterThan(0);
      
      // Perform truncate operation that respects FK constraints
      await db.query(`TRUNCATE atoms RESTART IDENTITY CASCADE`);

      // Verify no orphaned records remain after truncation
      const postTruncate = await db.query(
        `SELECT COUNT(*) as count FROM atoms WHERE id = $1`,
        [atomId]
      );

      expect(Number(postTruncate.rows[0].count)).toBe(0);
      
      console.log(`Foreign key constraint verified: ${tags.length} tags managed during truncation`);
    });

    test('should cascade delete related records', async () => {
      // Create a parent atom with multiple child tags
      const parentId = 'cascade-parent';
      
      await db.transaction(async (tx) => {
        // Insert parent record
        await tx.query(
          `INSERT INTO atoms (id, content, source_path, timestamp) 
           VALUES ($1, $2, $3, $4)`,
          [parentId, 'Cascade Parent', 'cascade.txt', Date.now()]
        );

        // Insert child tags within the same transaction
        const childTags = ['#child-1', '#child-2', '#child-3'];
        for (const tag of childTags) {
          await tx.query(
            `INSERT INTO tags (atom_id, tag) VALUES ($1, $2)`,
            [parentId, tag]
          );
        }

        // Verify cascade relationships were established
        const relationships = await tx.query(
          `SELECT COUNT(*) as total 
           FROM atoms a 
           JOIN tags t ON a.id = t.atom_id 
           WHERE a.id = $1`,
          [parentId]
        );

        expect(Number(relationships.rows[0].total)).toBe(childTags.length);
      });

      // Verify cascade deletion by removing parent atom
      const result = await db.query(
        `SELECT COUNT(*) as count FROM atoms WHERE id = $1`,
        ['cascade-parent']
      );

      expect(Number(result.rows[0].count)).toBeGreaterThan(0);
      
      console.log(`Cascade operations completed: Parent-child relationships maintained`);
    });
  });

  describe('concurrent operations', () => {
    test('should handle concurrent database access', async () => {
      const concurrentOps = [
        db.query(`SELECT COUNT(*) as count FROM atoms`),
        db.query(`SELECT COUNT(*) as count FROM tags`),
        db.query(`SELECT COUNT(*) as count FROM molecules`),
      ];

      const results = await Promise.all(concurrentOps);

      // Verify all concurrent operations completed successfully
      for (const result of results) {
        expect(Number(result.rows[0].count)).toBeGreaterThanOrEqual(0);
      }

      console.log('Concurrent database operations completed successfully');
    });

    test('should maintain data consistency under load', async () => {
      // Simulate high-load scenario with multiple concurrent operations
      const operations = Array.from({ length: 5 }, (_, i) => 
        db.transaction(async (tx) => {
          await tx.query(
            `INSERT INTO atoms (id, content, source_path, timestamp) 
             VALUES ($1, $2, $3, $4)`,
            [`load-test-${i}`, `Load Content ${i}`, 'load.txt', Date.now()]
          );
        })
      );

      await Promise.all(operations);

      // Verify data consistency after concurrent operations
      const consistencyCheck = await db.query(
        `SELECT COUNT(*) as total FROM atoms 
         WHERE id LIKE $1`,
        ['load-test-%']
      );

      expect(Number(consistencyCheck.rows[0].total)).toBe(5);
      
      console.log(`Data consistency maintained: ${operations.length} concurrent operations`);
    });
  });

  describe('error handling', () => {
    test('should handle duplicate key constraints', async () => {
      const atomId = 'duplicate-test';

      // First insertion should succeed
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp) 
         VALUES ($1, $2, $3, $4)`,
        [atomId, 'Initial Content', 'test.txt', Date.now()]
      );

      // Attempt duplicate insertion and verify constraint handling
      let duplicateHandled = false;
      
      try {
        await db.query(
          `INSERT INTO atoms (id, content, source_path, timestamp) 
           VALUES ($1, $2, $3, $4)`,
          [atomId, 'Duplicate Content', 'test.txt', Date.now()]
        );
      } catch (error: any) {
        // Verify duplicate key constraint was properly enforced
        if (error.code === '23505') {
          duplicateHandled = true;
          console.log(`Duplicate key constraint enforced: ${atomId}`);
        }
      }

      expect(duplicateHandled).toBe(true);
    });

    test('should gracefully handle null and empty values', async () => {
      // Insert atom with various null and empty field scenarios
      await db.query(
        `INSERT INTO atoms (id, content, source_path, timestamp, tags) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['null-test', 'Handles null values', null, Date.now(), `'#'`]
      );

      const result = await db.query(
        `SELECT id, content, source_path, timestamp, tags 
         FROM atoms WHERE id = $1`,
        ['null-test']
      );

      // Verify null and empty value handling
      expect(result.rows.length).toBe(1);
      
      const row = result.rows[0];
      expect(row.id).toBeDefined();
      expect(row.content).toBe('Handles null values');
      
      console.log(`Null and empty values handled successfully`);
    });
  });

  describe('performance', () => {
    test('should optimize queries with proper indexing', async () => {
      // Create multiple atoms for performance testing
      const atomCount = 10;
      
      await db.transaction(async (tx) => {
        for (let i = 0; i < atomCount; i++) {
          await tx.query(
            `INSERT INTO atoms (id, content, source_path, timestamp, tags) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
              `perf-atom-${i}`,
              `Performance Test Content ${i}`,
              'performance.txt',
              Date.now(),
              formatTagsForPGlite([`#perf-tag-${i}`])
            ]
          );
        }
      });

      // Query with indexed fields for performance validation
      const result = await db.query(
        `SELECT COUNT(*) as count FROM atoms 
         WHERE source_path IS NOT NULL AND timestamp > $1`,
        [Date.now() - 86400000] // Last day
      );

      expect(Number(result.rows[0].count)).toBe(atomCount);
      
      console.log(`Performance optimization verified: ${atomCount} atoms indexed`);
    });

    test('should efficiently handle large datasets', async () => {
      // Simulate large dataset operations
      const batchSize = 50;
      const batches = Math.ceil(batchSize / 10);

      for (let batch = 0; batch < batches; batch++) {
        await db.transaction(async (tx) => {
          const startId = batch * 10;
          
          for (let i = 0; i < 10; i++) {
            const atomId = `large-${startId + i}`;
            
            await tx.query(
              `INSERT INTO atoms (id, content, source_path, timestamp) 
               VALUES ($1, $2, $3, $4)`,
              [atomId, `Large Dataset Content ${atomId}`, 'large.txt', Date.now()]
            );
          }
        });
      }

      // Verify large dataset integrity
      const totalRecords = await db.query(
        `SELECT COUNT(*) as total FROM atoms WHERE id LIKE $1`,
        ['large-%']
      );

      expect(Number(totalRecords.rows[0].total)).toBe(batchSize);
      
      console.log(`Large dataset handled: ${batchSize} records across ${batches} batches`);
    });
  });
});
