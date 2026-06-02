/**
 * Distill Manager - Version Control for Distills (Standard 016)
 *
 * Manages distill metadata in the database with pointers to files on disk.
 * Distills are checkpoints with timestamps - version-controlled knowledge snapshots.
 */

import { db } from '../../core/db.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import crypto from 'crypto';
import fs from 'fs';

export interface DistillMetadata {
  id: string;
  timestamp: string;
  filename: string;
  file_path: string;
  line_count: number;
  lines_unique: number;
  compression_ratio: number | null;
  source_sessions: string[];
  source_files: string[];
  parameters: Record<string, any>;
  // Pointer-based file reading (Standard: Pointer-Based File Reading for Distills v5.3.0)
  start_byte: number;  // Byte offset where file content starts
  end_byte: number;    // Byte offset where file content ends
  file_size: number;   // Total file size for metadata
  created_at?: string;
}

/**
 * Generate unique ID for a distill
 */
function generateDistillId(): string {
  return `distill_${Date.now()}_${crypto.randomBytes(8).toString('hex').substring(0, 16)}`;
}

/**
 * Record a distill in the database
 * Reads actual file size and stores byte offsets for pointer-based reading
 */
export async function recordDistill(
  metadata: Omit<DistillMetadata, 'id' | 'created_at'>,
): Promise<DistillMetadata> {
  const id = generateDistillId();
  const now = new Date().toISOString();

  // Calculate byte offsets for pointer-based file reading
  let startByte = 0;
  let endByte = 0;
  let fileSize = 0;

  // If byte offsets are provided, use them; otherwise read file size
  if (metadata.start_byte !== undefined) {
    startByte = metadata.start_byte;
  }
  
  if (metadata.file_size > 0) {
    fileSize = metadata.file_size;
  } else if (metadata.file_path && fs.existsSync(metadata.file_path)) {
    // Read actual file size
    try {
      const stats = fs.statSync(metadata.file_path);
      fileSize = stats.size;
      // For full file distills, start at 0 and end at file size
      startByte = 0;
      endByte = fileSize;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const errObj = error instanceof Error ? error : new Error(msg);
      StructuredLogger.error('FILE_STAT_FAILED', msg, { path: metadata.file_path, stack: errObj.stack });
      fileSize = 0; // Default to 0 if can't read file
    }
  }

  const distill: DistillMetadata = {
    ...metadata,
    id,
    created_at: now,
    start_byte: startByte,
    end_byte: endByte,
    file_size: fileSize,
  };

  try {
    await db.run(
      `INSERT INTO distills (
        id, timestamp, filename, file_path, line_count, lines_unique,
        compression_ratio, source_sessions, source_files, parameters,
        start_byte, end_byte, file_size
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        distill.id,
        distill.timestamp,
        distill.filename,
        distill.file_path,
        distill.line_count,
        distill.lines_unique,
        distill.compression_ratio,
        distill.source_sessions,
        distill.source_files,
        JSON.stringify(distill.parameters),
        startByte,
        endByte,
        fileSize,
      ],
    );

    StructuredLogger.info('DISTILL_RECORDED', {
      id: distill.id,
      timestamp: distill.timestamp,
      filename: distill.filename,
      line_count: distill.line_count,
      compression_ratio: distill.compression_ratio,
      // Pointer-based file reading info
      start_byte: startByte,
      end_byte: endByte,
      file_size: fileSize,
    });

    return distill;
  } catch (error: any) {
    StructuredLogger.error('DISTILL_RECORD_FAILED', error, {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get a distill by ID
 */
export async function getDistill(id: string): Promise<DistillMetadata | null> {
  try {
    const result = await db.run(
      'SELECT * FROM distills WHERE id = $1',
      [id],
    );

    if (!result.rows || result.rows.length === 0) {
      return null;
    }

    const row: any = result.rows[0];
    return {
      id: row.id,
      timestamp: row.timestamp,
      filename: row.filename,
      file_path: row.file_path,
      line_count: row.line_count,
      lines_unique: row.lines_unique,
      compression_ratio: row.compression_ratio,
      source_sessions: row.source_sessions || [],
      source_files: row.source_files || [],
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      // Pointer-based file reading (Standard: Pointer-Based File Reading for Distills v5.3.0)
      start_byte: row.start_byte !== undefined ? parseInt(row.start_byte) : 0,
      end_byte: row.end_byte !== undefined ? parseInt(row.end_byte) : 0,
      file_size: row.file_size !== undefined ? parseInt(row.file_size) : 0,
      created_at: row.created_at?.toISOString(),
    };
  } catch (error: any) {
    StructuredLogger.error('DISTILL_GET_FAILED', error, { id });
    return null;
  }
}

/**
 * Get distills by timestamp range or session
 */
export async function getDistillsBySession(sessionId: string): Promise<DistillMetadata[]> {
  try {
    const result = await db.run(
      'SELECT * FROM distills WHERE $1 = ANY(source_sessions) ORDER BY timestamp DESC',
      [sessionId],
    );

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      filename: row.filename,
      file_path: row.file_path,
      line_count: row.line_count,
      lines_unique: row.lines_unique,
      compression_ratio: row.compression_ratio,
      source_sessions: row.source_sessions || [],
      source_files: row.source_files || [],
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      created_at: row.created_at?.toISOString(),
    }));
  } catch (error: any) {
    StructuredLogger.error('DISTILL_GET_BY_SESSION_FAILED', error, { sessionId });
    return [];
  }
}

/**
 * Get all distills, ordered by timestamp (newest first)
 */
export async function getAllDistills(limit: number = 50): Promise<DistillMetadata[]> {
  try {
    const result = await db.run(
      'SELECT * FROM distills ORDER BY timestamp DESC LIMIT $1',
      [limit],
    );

    return (result.rows || []).map((row: any) => ({
      id: row.id,
      timestamp: row.timestamp,
      filename: row.filename,
      file_path: row.file_path,
      line_count: row.line_count,
      lines_unique: row.lines_unique,
      compression_ratio: row.compression_ratio,
      source_sessions: row.source_sessions || [],
      source_files: row.source_files || [],
      parameters: row.parameters ? JSON.parse(row.parameters) : {},
      created_at: row.created_at?.toISOString(),
    }));
  } catch (error: any) {
    StructuredLogger.error('DISTILL_GET_ALL_FAILED', error);
    return [];
  }
}

/**
 * Delete a distill from database (file must be deleted separately)
 */
export async function deleteDistill(id: string): Promise<boolean> {
  try {
    await db.run('DELETE FROM distills WHERE id = $1', [id]);
    StructuredLogger.info('DISTILL_DELETED', { id });
    return true;
  } catch (error: any) {
    StructuredLogger.error('DISTILL_DELETE_FAILED', error, { id });
    return false;
  }
}
