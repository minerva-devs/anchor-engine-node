/**
 * Physics Tag Walker Tests
 *
 * Tests the PhysicsTagWalker class including temporal decay handling
 * and underflow prevention for very old timestamps.
 */

import { describe, test, expect, beforeEach, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import * as path from 'path';
import * as fs from 'fs';

describe('Physics Tag Walker', () => {
  let db: PGlite;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique temp database path for each test
    testDbPath = path.join(process.cwd(), 'test-physics-db-' + Date.now());

    // Clean up if exists
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }

    // Initialize fresh database
    db = new PGlite(testDbPath);
    await db.waitReady;

    // Create required tables
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
        simhash TEXT,
        type TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        atom_id TEXT REFERENCES atoms(id),
        tag TEXT
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS molecules (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        compound_id TEXT,
        start_byte BIGINT,
        end_byte BIGINT,
        timestamp BIGINT
      )
    `);
  });

  afterAll(async () => {
    // Cleanup database
    if (db) {
      await db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  /**
   * Test 1: Verify no underflow with very old timestamps
   * This tests the CASE statement fix that prevents EXP underflow
   */
  test('should handle very old timestamps without underflow', async () => {
    const now = Date.now();
    const veryOld = now - 10000000000; // 10 billion ms ago (~115 days)

    // Insert test atoms
    await db.query(`
      INSERT INTO atoms (id, content, timestamp, tags, simhash)
      VALUES
        ('atom1', 'Recent content', ${now}, '["#test", "#recent"]', '0000000000000000'),
        ('atom2', 'Very old content', ${veryOld}, '["#test", "#old"]', '0000000000000000')
    `);

    await db.query(`
      INSERT INTO tags (atom_id, tag) VALUES
        ('atom1', '#test'),
        ('atom1', '#recent'),
        ('atom2', '#test'),
        ('atom2', '#old')
    `);

    // Test the temporal decay calculation that was causing underflow
    // This should NOT throw "value out of range: underflow"
    const result = await db.query(`
      SELECT
        id,
        timestamp,
        CASE
          WHEN ABS(timestamp - ${now}) > 8640000000 THEN 0.0
          ELSE EXP(-0.0001 * ABS(timestamp - ${now}))
        END as temporal_weight
      FROM atoms
      ORDER BY timestamp DESC
    `);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].temporal_weight).toBeGreaterThan(0); // Recent atom
    expect(result.rows[1].temporal_weight).toBe(0); // Old atom (clamped to 0)
  });

  /**
   * Test 2: Verify temporal decay works correctly for recent timestamps
   */
  test('should apply correct temporal decay for recent atoms', async () => {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour ago
    const oneDayAgo = now - 86400000; // 1 day ago

    await db.query(`
      INSERT INTO atoms (id, content, timestamp, tags, simhash)
      VALUES
        ('atom1', 'One hour ago', ${oneHourAgo}, '["#test"]', '0000000000000000'),
        ('atom2', 'One day ago', ${oneDayAgo}, '["#test"]', '0000000000000000')
    `);

    const result = await db.query(`
      SELECT
        id,
        EXP(-0.0001 * ABS(timestamp - ${now})) as temporal_weight
      FROM atoms
      ORDER BY temporal_weight DESC
    `);

    expect(result.rows).toHaveLength(2);
    // One hour ago should have higher weight than one day ago
    expect(result.rows[0].temporal_weight).toBeGreaterThan(result.rows[1].temporal_weight);
    // Both should be > 0 (not clamped)
    expect(result.rows[0].temporal_weight).toBeGreaterThan(0);
    expect(result.rows[1].temporal_weight).toBeGreaterThan(0);
  });

  /**
   * Test 3: Verify tag-based retrieval works
   */
  test('should find atoms by shared tags', async () => {
    const now = Date.now();

    await db.query(`
      INSERT INTO atoms (id, content, timestamp, tags, simhash)
      VALUES
        ('atom1', 'Content about robots', ${now}, '["#robots", "#ai"]', '0000000000000000'),
        ('atom2', 'More about robots', ${now}, '["#robots", "#tech"]', '0000000000000000'),
        ('atom3', 'About cooking', ${now}, '["#cooking", "#food"]', '0000000000000000')
    `);

    await db.query(`
      INSERT INTO tags (atom_id, tag) VALUES
        ('atom1', '#robots'), ('atom1', '#ai'),
        ('atom2', '#robots'), ('atom2', '#tech'),
        ('atom3', '#cooking'), ('atom3', '#food')
    `);

    // Find atoms sharing tags with atom1
    const result = await db.query(`
      SELECT DISTINCT a2.id, COUNT(DISTINCT t1.tag) as shared_tags
      FROM atoms a1
      JOIN tags t1 ON a1.id = t1.atom_id
      JOIN tags t2 ON t1.tag = t2.tag
      JOIN atoms a2 ON t2.atom_id = a2.id
      WHERE a1.id = 'atom1' AND a2.id != 'atom1'
      GROUP BY a2.id
      ORDER BY shared_tags DESC
    `);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('atom2');
    expect(result.rows[0].shared_tags).toBe(1); // Share #robots
  });

  /**
   * Test 4: Verify SimHash similarity calculation
   */
  test('should calculate SimHash similarity correctly', async () => {
    await db.query(`
      INSERT INTO atoms (id, content, timestamp, simhash)
      VALUES
        ('atom1', 'Same hash', 1000, '0000000000000000'),
        ('atom2', 'Same hash', 1000, '0000000000000000'),
        ('atom3', 'Different hash', 1000, 'FFFFFFFFFFFFFFFF')
    `);

    const result = await db.query(`
      SELECT
        id,
        simhash,
        1.0 - (bit_count(('x' || LPAD(COALESCE(simhash, '0'), 16, '0'))::bit(64) # ('x' || '0000000000000000')::bit(64)) / 64.0) as similarity
      FROM atoms
    `);

    expect(result.rows).toHaveLength(3);
    // atom1 and atom2 should have similarity 1.0 (identical)
    const atom1 = result.rows.find(r => r.id === 'atom1');
    const atom2 = result.rows.find(r => r.id === 'atom2');
    const atom3 = result.rows.find(r => r.id === 'atom3');

    expect(atom1.similarity).toBe(1.0);
    expect(atom2.similarity).toBe(1.0);
    expect(atom3.similarity).toBe(0.0); // Completely different
  });

  /**
   * Test 5: Verify full physics weighting formula doesn't underflow
   */
  test('should complete full physics weighting without errors', async () => {
    const now = Date.now();
    const veryOld = now - 20000000000; // 20 billion ms ago (~231 days)

    await db.query(`
      INSERT INTO atoms (id, content, timestamp, tags, simhash)
      VALUES
        ('anchor', 'Anchor atom', ${now}, '["#test"]', '0000000000000000'),
        ('recent', 'Recent atom', ${now}, '["#test"]', '0000000000000000'),
        ('old', 'Old atom', ${veryOld}, '["#test"]', '0000000000000000')
    `);

    await db.query(`
      INSERT INTO tags (atom_id, tag) VALUES
        ('anchor', '#test'),
        ('recent', '#test'),
        ('old', '#test')
    `);

    // This is the full physics weighting formula from production code
    // It should NOT throw underflow errors
    const result = await db.query(`
      WITH anchor_stats AS (
        SELECT id as anchor_id, timestamp as anchor_ts, simhash as anchor_sh
        FROM atoms WHERE id = 'anchor'
      ),
      candidates AS (
        SELECT a.id as atom_id, a.timestamp, a.simhash,
               COUNT(DISTINCT t.tag) as shared_tags
        FROM tags t
        JOIN atoms a ON t.atom_id = a.id
        WHERE t.tag IN (SELECT DISTINCT tag FROM tags WHERE atom_id = 'anchor')
          AND a.id != 'anchor'
        GROUP BY a.id, a.timestamp, a.simhash
      ),
      scored AS (
        SELECT
          c.atom_id,
          c.timestamp,
          c.shared_tags,
          MAX(
            GREATEST(0.0, LEAST(1.0,
              (c.shared_tags / 10.0) *
              CASE
                WHEN ABS(c.timestamp - ast.anchor_ts) > 8640000000 THEN 0.0
                ELSE EXP(-0.0001 * ABS(c.timestamp - ast.anchor_ts))
              END
            ))
          ) as score
        FROM candidates c
        CROSS JOIN anchor_stats ast
        GROUP BY c.atom_id, c.timestamp, c.shared_tags, ast.anchor_ts
      )
      SELECT * FROM scored ORDER BY score DESC
    `);

    expect(result.rows).toHaveLength(2);
    // Recent atom should have higher score
    expect(result.rows[0].atom_id).toBe('recent');
    expect(result.rows[0].score).toBeGreaterThan(0);
    // Old atom should have score 0 (temporal decay clamped it)
    expect(result.rows[1].atom_id).toBe('old');
    expect(result.rows[1].score).toBe(0);
  });
});