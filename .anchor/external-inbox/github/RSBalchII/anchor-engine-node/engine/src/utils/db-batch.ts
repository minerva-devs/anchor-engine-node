/**
 * Database Query Batching Utilities
 *
 * Optimizes database access by batching individual queries into bulk operations.
 * Reduces round-trips and improves throughput for bulk operations.
 *
 * @see Standard 132: Adaptive Concurrency
 * @see Standard 062: Memory Management
 */

import { db } from '../core/db.js';

/**
 * Batch fetch compounds by IDs
 *
 * Instead of: SELECT ... WHERE id = ? (N times)
 * Use:        SELECT ... WHERE id = ANY(?) (1 time)
 *
 * @param compoundIds - Array of compound IDs to fetch
 * @returns Map of compound_id -> compound data (path and provenance only)
 */
export async function batchFetchCompounds(
  compoundIds: string[]
): Promise<Map<string, { path: string; provenance: string }>> {
  if (!compoundIds || compoundIds.length === 0) {
    return new Map();
  }

  // Remove duplicates
  const uniqueIds = Array.from(new Set(compoundIds));

  // PGlite supports ANY() for array comparisons
  const result = await db.run(
    'SELECT id, path, provenance FROM compounds WHERE id = ANY($1)',
    [uniqueIds]
  );

  const compoundMap = new Map<string, { path: string; provenance: string }>();

  if (result.rows && result.rows.length > 0) {
    for (const row of result.rows) {
      compoundMap.set(row.id as string, {
        path: row.path as string,
        provenance: row.provenance as string,
      });
    }
  }

  return compoundMap;
}

/**
 * Batch fetch atoms by compound IDs
 * 
 * Instead of: SELECT ... WHERE compound_id = ? (N times)
 * Use:        SELECT ... WHERE compound_id = ANY(?) (1 time)
 * 
 * @param compoundIds - Array of compound IDs
 * @param options - Query options
 * @returns Array of atom records
 */
export async function batchFetchAtoms(
  compoundIds: string[],
  options: {
    limit?: number;
    provenance?: string;
    buckets?: string[];
  } = {}
): Promise<any[]> {
  if (!compoundIds || compoundIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(compoundIds));
  const limit = options.limit || 1000;

  let query = `
    SELECT a.id, a.content, a.byte_offset, a.compound_id, c.path, c.provenance, c.timestamp
    FROM atoms a
    JOIN compounds c ON a.compound_id = c.id
    WHERE a.compound_id = ANY($1)
  `;

  const params: any[] = [uniqueIds];
  let paramIndex = 2;

  if (options.provenance && options.provenance !== 'all') {
    query += ` AND c.provenance = $${paramIndex++}`;
    params.push(options.provenance);
  }

  if (options.buckets && options.buckets.length > 0) {
    query += ` AND c.buckets && $${paramIndex++}`;
    params.push(options.buckets);
  }

  query += ` ORDER BY a.byte_offset LIMIT $${paramIndex}`;
  params.push(limit);

  const result = await db.run(query, params);
  return result.rows || [];
}

/**
 * Batch insert atoms
 * 
 * Instead of: INSERT INTO atoms ... (N times)
 * Use:        INSERT INTO atoms ... VALUES (...), (...), ... (1 time)
 * 
 * @param atoms - Array of atom records to insert
 * @returns Number of atoms inserted
 */
export async function batchInsertAtoms(
  atoms: Array<{
    id: string;
    content: string;
    compound_id: string;
    byte_offset: number;
    buckets?: string[];
    tags?: string[];
  }>
): Promise<number> {
  if (!atoms || atoms.length === 0) {
    return 0;
  }

  // PGlite has limits on query size, so batch in chunks of 100
  const BATCH_SIZE = 100;
  let inserted = 0;

  for (let i = 0; i < atoms.length; i += BATCH_SIZE) {
    const batch = atoms.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(atom => {
      const buckets = atom.buckets ? JSON.stringify(atom.buckets) : 'NULL';
      const tags = atom.tags ? JSON.stringify(atom.tags) : 'NULL';
      return `('${atom.id}', '${atom.content.replace(/'/g, "''")}', '${atom.compound_id}', ${atom.byte_offset}, '${buckets}', '${tags}')`;
    }).join(', ');

    const query = `
      INSERT INTO atoms (id, content, compound_id, byte_offset, buckets, tags)
      VALUES ${values}
      ON CONFLICT (id) DO NOTHING
    `;

    await db.run(query);
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Batch insert tags
 * 
 * Instead of: INSERT INTO tags ... (N times)
 * Use:        INSERT INTO tags ... VALUES (...), (...), ... (1 time)
 * 
 * @param tags - Array of tag records to insert
 * @returns Number of tags inserted
 */
export async function batchInsertTags(
  tags: Array<{
    id: string;
    atom_id: string;
    tag: string;
    confidence?: number;
  }>
): Promise<number> {
  if (!tags || tags.length === 0) {
    return 0;
  }

  // Batch in chunks of 200
  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < tags.length; i += BATCH_SIZE) {
    const batch = tags.slice(i, i + BATCH_SIZE);
    
    const values = batch.map(tag => {
      const confidence = tag.confidence !== undefined ? tag.confidence : 0.8;
      return `('${tag.id}', '${tag.atom_id}', '${tag.tag.replace(/'/g, "''")}', ${confidence})`;
    }).join(', ');

    const query = `
      INSERT INTO tags (id, atom_id, tag, confidence)
      VALUES ${values}
      ON CONFLICT (id) DO NOTHING
    `;

    await db.run(query);
    inserted += batch.length;
  }

  return inserted;
}

/**
 * Batch update operation
 * 
 * Executes multiple UPDATE statements in a single transaction
 * 
 * @param updates - Array of update operations
 * @returns Number of rows updated
 */
export async function batchUpdate(
  updates: Array<{
    table: string;
    set: Record<string, any>;
    where: Record<string, any>;
  }>
): Promise<number> {
  if (!updates || updates.length === 0) {
    return 0;
  }

  let updated = 0;

  await db.transaction(async () => {
    for (const update of updates) {
      const setClauses = Object.keys(update.set)
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ');

      const whereClauses = Object.keys(update.where)
        .map((key, i) => `${key} = $${Object.keys(update.set).length + i + 1}`)
        .join(' AND ');

      const values = [
        ...Object.values(update.set),
        ...Object.values(update.where),
      ];

      const query = `
        UPDATE ${update.table}
        SET ${setClauses}
        WHERE ${whereClauses}
      `;

      const result = await db.run(query, values);
      updated += result.rows?.length || 0;
    }
  });

  return updated;
}

/**
 * Batch delete operation
 * 
 * Deletes multiple records using IN clause
 * 
 * @param table - Table name
 * @param ids - Array of IDs to delete
 * @param idColumn - Name of ID column (default: 'id')
 * @returns Number of rows deleted
 */
export async function batchDelete(
  table: string,
  ids: string[],
  idColumn: string = 'id'
): Promise<number> {
  if (!ids || ids.length === 0) {
    return 0;
  }

  const uniqueIds = Array.from(new Set(ids));

  // Use ANY() for efficient array comparison
  const query = `DELETE FROM ${table} WHERE ${idColumn} = ANY($1)`;
  const result = await db.run(query, [uniqueIds]);

  return result.rows?.length || uniqueIds.length;
}

/**
 * Estimate optimal batch size based on data size
 * 
 * @param itemSize - Estimated size of each item in bytes
 * @param maxBatchBytes - Maximum batch size in bytes (default: 1MB)
 * @returns Optimal batch size
 */
export function calculateOptimalBatchSize(
  itemSize: number = 1024,
  maxBatchBytes: number = 1024 * 1024
): number {
  return Math.max(1, Math.floor(maxBatchBytes / itemSize));
}
