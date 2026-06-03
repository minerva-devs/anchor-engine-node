/**
 * Radial Distiller v2.0 — Decision Record Output (Standard 051 Adapted)
 *
 * Three-phase pipeline for semantic corpus compression:
 * 1. COLLECT: Extract semantic blocks from molecules table (inline content)
 * 2. DEDUPLICATE: Block-level deduplication with SimHash
 * 3. REASSEMBLE: Build Decision Record JSON output
 *
 * Adapted for Standard 051: Uses molecules instead of compounds,
 * reads inline content from DB rather than filesystem.
 */

import { db } from '../../core/db.js';
import { ContextInflator } from '../search/context-inflator.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { pathManager } from '../../utils/path-manager.js';
import { getMirrorPath } from '../mirror/mirror.js';
import { recordDistill } from './distill-manager.js';
import { wasmModuleLoader } from '../../utils/wasm-module-loader.js';
import { config } from '../../config/index.js';
import { DIST_DIR } from '../../config/paths.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Configuration
const PGLITE_CHUNK_IDS = 100;
const MOBILE_MEMORY_THRESHOLD = 500 * 1024 * 1024;

/**
 * Check if a file should be excluded (distillation output)
 */
function isDistillationOutput(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return /distilled_.*\.(yaml|json|md)$/i.test(fileName) ||
         /MASTER_DISTILLED_.*\.(yaml|json|md)$/i.test(fileName) ||
         /_distilled_.*\.(yaml|json|md)$/i.test(fileName);
}

/**
 * Semantic Block interface
 */
export interface SemanticBlock {
  id: string;
  type: 'heading1' | 'heading2' | 'heading3' | 'problem' | 'solution' | 'rationale' | 'status' | 'content';
  content: string;
  heading?: string;
  level: number;
  provenance: string[];
  mtime: number;
  simhash: string;
  tags?: string[];
}

/**
 * Decision Record interface (final output)
 */
export interface DecisionRecord {
  id: string;
  title: string;
  problem?: string;
  solution?: string[];
  rationale?: string;
  supersedes?: string[];
  status: 'active' | 'deprecated' | 'archived';
  timestamp: string;
  provenance: string[];
  tags: string[];
}

/**
 * Temporal metadata extracted via cascade
 */
export interface TemporalMetadata {
  primary: string;           // YYYY-MM-DD
  fallback_source: 'content' | 'git' | 'filename' | 'mtime';
}

/**
 * Memory type classification
 */
export type MemoryType = 'episodic' | 'procedural' | 'semantic' | 'metacognitive';

/**
 * Enriched decision record with temporal and memory type metadata
 */
export interface EnrichedDecisionRecord extends DecisionRecord {
  temporal: TemporalMetadata;
  memory_type: MemoryType;
  frequency?: number;
  source_files?: string[];
  related_entries?: string[];
}

/**
 * Universal Digital Object Metadata (adapted for molecules)
 */
export interface DigitalObjectMetadata {
  id: string;                   // Unique identifier (hash or UUID)
  source_path: string;          // Original file path
  source_type: string;          // File extension or format hint
  created_at?: string;
  modified_at: string;
  ingested_at: string;
  bucket: string;
  compound_id: string;
  size_bytes: number;
  line_count?: number;
  char_count?: number;
  topics?: string[];
  entities?: string[];
  tags?: string[];
}

/**
 * Chat Session Metadata (extends digital object with session-specific data)
 */
export interface ChatSessionMetadata extends DigitalObjectMetadata {
  session_id: string;
  session_start: string;
  session_end: string;
  commands: string[];
  message_count: number;
  participants: string[];
  models?: string[];
}

/**
 * Session Index Entry (for query routing)
 */
export interface SessionIndexEntry {
  session_id: string;
  date: string;
  commands: string[];
  topics: string[];
  full_log_path: string;
  message_count: number;
  participants: string[];
}

/**
 * Radial Distillation Request
 */
export interface RadialDistillRequest {
  seed?: {
    query?: string;
    compound_ids?: string[];
    buckets?: string[];
    tags?: string[];
  };
  radius?: number;
  max_radius?: number;
  output_format?: 'yaml' | 'json' | 'decision-records' | 'json-full' | 'nested-yaml';
  output_path?: string;
  export_to_inbox?: boolean;
  auto_save?: boolean;
  mode?: 'standard' | 'tag-based' | 'corpus';
  dry_run?: boolean;
  max_molecules?: number;      // Limit number of molecules to process (for API speed)
  timeout_seconds?: number;    // Maximum time allowed for distillation (in seconds)
  include_code?: boolean;      // Whether to include code content in output
}

/**
 * Distillation Result (Decision Record output)
 */
export interface DistillationResult {
  stats: {
    compounds_processed: number;
    blocks_total: number;
    blocks_unique: number;
    decision_records: number;
    compression_ratio: string; // e.g., "1.68:1" for compressed corpus
    duration_ms: number;
    memory_peak_mb: number;
  };
  output: {
    format: string;
    path?: string;
    size_bytes: number;
    records_created?: number;
  };
  provenance: {
    source_compounds: string[];
    distilled_at: string;
    parameters: RadialDistillRequest;
  };
  records?: DecisionRecord[];
  digital_objects?: DigitalObjectMetadata[];
  session_index?: SessionIndexEntry[];
  inflated_content?: { content: string; source: string; tags: string[]; timestamp: number }[];
  enriched_records?: EnrichedDecisionRecord[];
}

/**
 * Compute SimHash for a block using WASM module (Rust-compiled)
 */
function computeSimHash(text: string): string {
  try {
    const hash = wasmModuleLoader.fingerprint(text);
    if (hash && typeof hash === 'bigint') {
      return hash.toString(16).padStart(16, '0').substring(0, 16);
    }
  } catch (e: any) {}

  // Fallback: deterministic hash using crypto
  const hash = crypto.createHash('sha256')
    .update(text.toLowerCase().replace(/\s+/g, ' '))
    .digest('hex');
  return hash.substring(0, 16);
}

/**
 * Extract tags from content
 */
function extractTags(content: string): string[] {
  const tagPattern = /#(\w+)/g;
  const tags: string[] = [];
  let match;
  
  while ((match = tagPattern.exec(content)) !== null) {
    tags.push(match[1].toLowerCase());
  }
  
  return tags;
}

/**
 * Extract digital object metadata from a molecule (adapted for Standard 051)
 */
function extractDigitalObjectMetadata(
  molecule: any,
  content: string,
  mtime: number,
  ingestedAt: string,
): DigitalObjectMetadata {
  const pathExt = path.extname(molecule.source_path).toLowerCase();
  const sourceType = pathExt.slice(1) || 'unknown';
  
  // Base metadata (always present)
  const metadata: DigitalObjectMetadata = {
    id: crypto.createHash('sha256').update(molecule.id).digest('hex').substring(0, 16),
    source_path: molecule.source_path,
    source_type: sourceType,
    modified_at: new Date(mtime).toISOString(),
    ingested_at: ingestedAt,
    bucket: molecule.provenance || 'unknown',
    compound_id: molecule.compound_id,
    size_bytes: Buffer.byteLength(content, 'utf-8'),
    line_count: content.split('\n').length,
    char_count: content.length,
    topics: [],
    entities: [],
    tags: [],
  };
  
  // Extract topics from content (simple keyword extraction)
  const topicKeywords = content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
  metadata.topics = Array.from(new Set(topicKeywords.slice(0, 10)));
  
  // Extract tags (hashtag pattern)
  const tagMatches = content.match(/#(\w+)/g) || [];
  metadata.tags = Array.from(new Set(tagMatches.map(t => t.slice(1).toLowerCase())));
  
  return metadata;
}

/**
 * Phase 1: COLLECT - Extract semantic blocks from molecules table
 * Queries molecules directly (Standard 051), not compounds + filesystem
 */
async function collectBlocksFromMolecules(
  request?: { query?: string; compound_ids?: string[]; buckets?: string[]; tags?: string[]; max_molecules?: number }
): Promise<SemanticBlock[]> {
  const blocks: SemanticBlock[] = [];

  // Calculate max limit (default to corpus mode when no seed or empty object)
  let limitParam = PGLITE_CHUNK_IDS;
  if (request?.max_molecules && request.max_molecules < PGLITE_CHUNK_IDS) {
    limitParam = request.max_molecules;
  }

  // Query molecules directly (Standard 051)
  let sql = `SELECT id, content, source_path, provenance, timestamp FROM molecules WHERE content IS NOT NULL AND LENGTH(content) > 10`;
  const params: any[] = [];

  if (request?.compound_ids && request.compound_ids.length > 0) {
    sql += ` AND compound_id IN (${request.compound_ids.map((_, i) => `$${i + 1}`).join(',')})`;
    params.push(...request.compound_ids);
  } else if (request?.query) {
    // Use search to find relevant compounds, then query their molecules
    const searchResult = await db.run(
      `SELECT DISTINCT compound_id FROM atoms WHERE content ILIKE $1`,
      [`%${request.query}%`]
    );
    const compoundIds = searchResult.rows.map((r: any) => r.compound_id);
    if (compoundIds.length > 0) {
      sql += ` AND compound_id IN (${compoundIds.map((_: string, i: number) => `$${i + 1}`).join(',')})`;
      params.push(...compoundIds);
    }
  } else if (request?.buckets && request.buckets.length > 0) {
    sql += ` AND provenance IN (${request.buckets.map((_, i) => `$${i + 1}`).join(',')})`;
    params.push(...request.buckets);
  } else if (request?.tags && request.tags.length > 0) {
    // Tag-based mode: query molecules with matching tags
    sql += ` AND tags @> $1::jsonb`;
    params.push(JSON.stringify(request.tags));
  }

  sql += ` ORDER BY timestamp DESC LIMIT ${limitParam}`;

  const result = await db.run(sql, params);
  
  for (const row of result.rows) {
    const content = row.content || '';
    if (!content || content.length < 10) continue;
    
    // Extract blocks from molecule content
    const lines = content.split('\n');
    let currentBlock: SemanticBlock | null = null;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect heading patterns (level 1-3)
      if (/^#{1,3}\s/.test(trimmed)) {
        if (currentBlock && currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        
        const level = trimmed.match(/^#/) ? trimmed.match(/^#/)!.length : 1;
        const heading = trimmed.replace(/^#+\s/, '');
        
        currentBlock = {
          id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
          type: level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3',
          content: trimmed,
          heading: heading,
          level: level,
          provenance: [row.provenance || 'unknown'],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };
      } else if (/^(?:problem|issue|challenge):/i.test(trimmed)) {
        if (currentBlock && currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
          type: 'problem',
          content: trimmed,
          heading: undefined,
          level: 1,
          provenance: [row.provenance || 'unknown'],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };
      } else if (/^(?:solution|approach|method):/i.test(trimmed)) {
        if (currentBlock && currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
          type: 'solution',
          content: trimmed,
          heading: undefined,
          level: 1,
          provenance: [row.provenance || 'unknown'],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };
      } else if (/^(?:rationale|reasoning|justification):/i.test(trimmed)) {
        if (currentBlock && currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
          type: 'rationale',
          content: trimmed,
          heading: undefined,
          level: 1,
          provenance: [row.provenance || 'unknown'],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };
      } else if (/^(?:status|state):/i.test(trimmed)) {
        if (currentBlock && currentBlock.content.length > 0) {
          blocks.push(currentBlock);
        }
        
        currentBlock = {
          id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
          type: 'status',
          content: trimmed,
          heading: undefined,
          level: 1,
          provenance: [row.provenance || 'unknown'],
          mtime: row.timestamp * 1000,
          simhash: computeSimHash(trimmed),
          tags: extractTags(trimmed),
        };
      } else if (trimmed.length > 0) {
        // Regular content block
        if (!currentBlock) {
          currentBlock = {
            id: `block-${crypto.createHash('sha256').update(trimmed).digest('hex').substring(0, 8)}`,
            type: 'content',
            content: trimmed,
            heading: undefined,
            level: 1,
            provenance: [row.provenance || 'unknown'],
            mtime: row.timestamp * 1000,
            simhash: computeSimHash(trimmed),
            tags: extractTags(trimmed),
          };
        } else {
          currentBlock.content += '\n' + trimmed;
        }
      }
    }
    
    // Push final block if exists
    if (currentBlock && currentBlock.content.length > 0) {
      blocks.push(currentBlock);
    }
  }
  
  StructuredLogger.info('[Distill] Phase 1: COLLECT', { 
    molecules_queried: result.rows.length, 
    blocks_extracted: blocks.length 
  });
  
  return blocks;
}

/**
 * Phase 2: DEDUPLICATE - Block-level deduplication with SimHash
 */
function deduplicateBlocks(blocks: SemanticBlock[]): SemanticBlock[] {
  const uniqueBlocks = new Map<string, SemanticBlock>();
  
  for (const block of blocks) {
    const key = `${block.type}:${block.simhash}`;
    
    if (!uniqueBlocks.has(key)) {
      uniqueBlocks.set(key, block);
    } else {
      // Merge provenance
      const existing = uniqueBlocks.get(key)!;
      for (const prov of block.provenance) {
        if (!existing.provenance.includes(prov)) {
          existing.provenance.push(prov);
        }
      }
      // Use earliest mtime
      if (block.mtime < existing.mtime) {
        existing.mtime = block.mtime;
      }
    }
  }
  
  return Array.from(uniqueBlocks.values());
}

/**
 * Phase 3: REASSEMBLE - Build Decision Records from blocks
 * Groups by SIMHASH (content similarity) not by file - enables cross-file dedup
 */
function assembleDecisionRecords(blocks: SemanticBlock[]): DecisionRecord[] {
  const records: DecisionRecord[] = [];
  
  // Group blocks by SIMHASH + TYPE (same concept across files)
  const blocksByConcept = new Map<string, SemanticBlock[]>();
  
  for (const block of blocks) {
    // Key by simhash + type to group identical concepts across files
    const conceptKey = `${block.type}:${block.simhash}`;
    
    if (!blocksByConcept.has(conceptKey)) {
      blocksByConcept.set(conceptKey, []);
    }
    blocksByConcept.get(conceptKey)!.push(block);
  }
  
  // Create ONE decision record per unique concept (not per file!)
  for (const [conceptKey, conceptBlocks] of blocksByConcept.entries()) {
    // Merge ALL provenance from all files that share this concept
    const allProvenance = Array.from(
      new Set(conceptBlocks.flatMap(b => b.provenance))
    );
    
    // Merge ALL tags
    const allTags = Array.from(
      new Set(conceptBlocks.flatMap(b => b.tags || []))
    );
    
    // Use earliest mtime
    const earliestMtime = Math.min(...conceptBlocks.map(b => b.mtime));
    
    // Find best title (prefer heading1/2, fallback to first block's heading)
    const titleBlock = conceptBlocks.find(b => b.type === 'heading1' || b.type === 'heading2');
    const title = titleBlock?.heading || conceptBlocks[0]?.heading || 'Untitled Concept';
    
    // Extract problem (merge from all blocks that have it)
    const problemBlocks = conceptBlocks.filter(b => b.type === 'problem');
    const problem = problemBlocks.length > 0 
      ? problemBlocks.map(b => b.content).join('\n\n')
      : undefined;
    
    // Extract solutions (merge from all blocks)
    const solutionBlocks = conceptBlocks.filter(b => b.type === 'solution');
    const solution = solutionBlocks.length > 0
      ? solutionBlocks.flatMap(b => {
          // Try to extract numbered lists, fallback to full content
          const lines = b.content.split('\n');
          const numbered = lines.filter(l => /^\d+\./.test(l.trim()));
          return numbered.length > 0 ? numbered : [b.content];
        })
      : undefined;
    
    // Extract rationale (merge from all blocks)
    const rationaleBlocks = conceptBlocks.filter(b => b.type === 'rationale');
    const rationale = rationaleBlocks.length > 0
      ? rationaleBlocks.map(b => b.content).join('\n\n')
      : undefined;
    
    // Extract status
    const statusBlock = conceptBlocks.find(b => b.type === 'status');
    let status: DecisionRecord['status'] = 'active';
    if (statusBlock) {
      const statusText = statusBlock.content.toLowerCase();
      if (statusText.includes('deprecated') || statusText.includes('superseded')) {
        status = 'deprecated';
      } else if (statusText.includes('archived') || statusText.includes('legacy')) {
        status = 'archived';
      }
    }
    
    // Build unified content from all blocks
    const content = conceptBlocks
      .map(b => b.content)
      .filter(Boolean)
      .join('\n\n');
    
    // Generate ID from simhash (same concept = same ID)
    const simhash = conceptBlocks[0]?.simhash || '';
    const id = `concept-${simhash.substring(0, 16)}`;
    
    records.push({
      id,
      title,
      problem,
      solution: solution && solution.length > 0 ? solution : undefined,
      rationale,
      supersedes: undefined,
      status,
      timestamp: new Date(earliestMtime).toISOString(),
      provenance: allProvenance,  // ALL files that share this concept
      tags: allTags,
    });
  }
  
  return records;
}

/**
 * Compute compression ratio (total input bytes vs output bytes)
 */
function computeCompressionRatio(
  totalInputBytes: number,
  outputSizeBytes: number
): string {
  if (outputSizeBytes === 0 || totalInputBytes === 0) return '0.0:1';
  
  const ratio = totalInputBytes / outputSizeBytes;
  return `${ratio.toFixed(2)}:1`;
}

// ============================================================================
// Main Export Functions (Cache-First Distillation)
// ============================================================================

/**
 * Radial distillation with cache-first approach (Standard 051 adapted)
 */
export async function radialDistill(
  request: RadialDistillRequest,
  _overrideSeed?: string | null
): Promise<DistillationResult> {
  const startTime = Date.now();
  
  // DEBUG: Log what's being passed
  console.log('[DEBUG radialDistill] request type:', typeof request);
  console.log('[DEBUG radialDistill] request:', JSON.stringify(request));
  console.log('[DEBUG radialDistill] request.seed:', request?.seed);
  console.log('[DEBUG radialDistill] request.mode:', request?.mode);
  console.log('[DEBUG radialDistill] request.seed === undefined:', request?.seed === undefined);
  
  // Write debug info to file — MUST be in .anchor/logs/ per doc_policy.md Section 5
  const { writeFileSync } = require('fs');
  const os = require('os');
  const homeDir = os.homedir();
  const logPath = `${homeDir}/.anchor/logs/radial-distill-debug.log`;
  try {
    writeFileSync(
      logPath, 
      `request: ${JSON.stringify(request)}\n` +
      `request.seed: ${JSON.stringify(request?.seed)}\n` +
      `request.seed === undefined: ${request?.seed === undefined}\n`
    );
    console.log('[DEBUG radialDistill] Debug log written to', logPath);
  } catch (writeErr) {
    console.error('[DEBUG radialDistill] Failed to write debug log:', String(writeErr));
  }
  
  // Determine if we're in corpus mode (full index) or standard mode
  const isCorpusMode = request.mode === 'corpus' || request.seed === undefined;
  
  let cachedResult: DistillationResult | null = null;
  let cacheKey: string;
  
  if (isCorpusMode) {
    // Corpus mode: use a fixed cache key
    cacheKey = 'corpus-full-index';
  } else if (request.seed) {
    // Standard mode: use seed as cache key (extract from request)
    cacheKey = JSON.stringify(request.seed);
  } else {
    throw new Error('No cache key provided for standard distillation');
  }
  
  /**
   * Step 1: Check database for cached result
   */
  if (cacheKey) {
    try {
      const cachedResultQuery = await db.run(`SELECT content FROM distills WHERE provenance->>'key' = $1`, [cacheKey]);
      
      if (cachedResultQuery.rows.length > 0 && cachedResultQuery.rows[0].content) {
        cachedResult = JSON.parse(cachedResultQuery.rows[0].content);
        StructuredLogger.info('[Distill] Cache hit', { cacheKey, duration_ms: Date.now() - startTime });
        return cachedResult as DistillationResult;
      }
    } catch (error: any) {
      // Database error or no content yet
      StructuredLogger.debug('[Distill] Cache miss or database error', { error: error.message });
    }
  }
  
  /**
   * Step 2: Run distillation if cache miss
   */
  if (!cachedResult) {
    const result = await runDistillation(request);
    
    /**
     * Step 3: Save to database for instant retrieval
     */
    if (!isCorpusMode || isCorpusMode && !request.auto_save) {
      // Only save explicitly requested results (not all corpus distillations automatically)
      try {
        const filename = `distilled_${cacheKey}_${Date.now()}.json`;
        const filePath = path.join(DIST_DIR, filename);
        
        await fs.promises.writeFile(filePath, JSON.stringify(result));
        
        // Save metadata to distills table
        const cacheValue = JSON.stringify(result);
        await db.run(`INSERT INTO distills (filename, file_path, content, provenance) 
                       VALUES ($1, $2, $3, $4)`, [
                        filename,
                        filePath,
                        cacheValue,
                        isCorpusMode ? 'corpus-full-index' : JSON.stringify(request.seed)
                      ]);
        
        StructuredLogger.info('[Distill] Saved to database', { cacheKey, duration_ms: Date.now() - startTime });
      } catch (error: any) {
        // Don't fail if save fails - distillation still succeeded
        StructuredLogger.warn('[Distill] Failed to save result', { error: error.message });
      }
    }
    
    return result;
  }
  
  // Default return: if cachedResult was found but not returned from the if block
  if (cachedResult) {
    return cachedResult as DistillationResult;
  }
  
  // Fallback: return empty result if nothing matched
  return {
    stats: {
      compounds_processed: 0,
      blocks_total: 0,
      blocks_unique: 0,
      decision_records: 0,
      compression_ratio: '0.0:1',
      duration_ms: Date.now() - startTime,
      memory_peak_mb: 54,
    },
    output: {
      format: request.output_format || 'decision-records',
      path: undefined,
      size_bytes: 0,
      records_created: 0,
    },
    provenance: {
      source_compounds: [],
      distilled_at: new Date().toISOString(),
      parameters: request,
    },
    records: [],
    digital_objects: [],
    session_index: [],
    inflated_content: [],
    enriched_records: [],
  };
}

/**
 * Internal distillation runner (Standard 051 adapted)
 */
async function runDistillation(
  request: RadialDistillRequest,
  seed?: string | null
): Promise<DistillationResult> {
  const startTime = Date.now();
  
  // Phase 1: COLLECT - Extract semantic blocks from molecules table
  const allBlocks = await collectBlocksFromMolecules(seed as any);
  
  if (allBlocks.length === 0) {
    StructuredLogger.warn('[Distill] No blocks extracted', { seed });
    return {
      stats: {
        compounds_processed: 0,
        blocks_total: 0,
        blocks_unique: 0,
        decision_records: 0,
        compression_ratio: '0.0:1',
        duration_ms: Date.now() - startTime,
        memory_peak_mb: 54,
      },
      output: {
        format: request.output_format || 'decision-records',
        path: undefined,
        size_bytes: 0,
        records_created: 0,
      },
      provenance: {
        source_compounds: [],
        distilled_at: new Date().toISOString(),
        parameters: request,
      },
      records: [],
      digital_objects: [],
      session_index: [],
      inflated_content: [],
      enriched_records: [],
    };
  }
  
  // Phase 2: DEDUPLICATE - Block-level deduplication with SimHash
  const uniqueBlocks = deduplicateBlocks(allBlocks);
  
  StructuredLogger.info('[Distill] Phase 2: DEDUPLICATE', { 
    blocks_total: allBlocks.length, 
    blocks_unique: uniqueBlocks.length 
  });
  
  // Phase 3: REASSEMBLE - Build Decision Records from blocks
  const records = assembleDecisionRecords(uniqueBlocks);
  
  StructuredLogger.info('[Distill] Phase 3: REASSEMBLE', { 
    decision_records: records.length 
  });
  
  // Compute compression ratio (approximate)
  const totalInputBytes = allBlocks.reduce((sum, b) => sum + Buffer.byteLength(b.content, 'utf-8'), 0);
  const outputSizeBytes = Buffer.byteLength(JSON.stringify(records), 'utf-8');
  const compressionRatio = computeCompressionRatio(totalInputBytes, outputSizeBytes);
  
  // Extract digital object metadata from molecules
  const digitalObjects: DigitalObjectMetadata[] = [];
  let moleculeQuery: any = null;
  try {
    moleculeQuery = await db.run(
      `SELECT id, source_path, provenance, timestamp FROM molecules WHERE content IS NOT NULL AND LENGTH(content) > 10 LIMIT ${PGLITE_CHUNK_IDS}`
    );
    
    for (const row of moleculeQuery.rows) {
      const ingestedAt = new Date(row.timestamp * 1000).toISOString();
      const mtime = row.timestamp * 1000;
      
      // Get content for metadata extraction
      const contentQuery = await db.run(
        `SELECT content FROM molecules WHERE id = $1`, [row.id]
      );
      const content = contentQuery.rows[0]?.content || '';
      
      digitalObjects.push(extractDigitalObjectMetadata(row, content, mtime, ingestedAt));
    }
  } catch (error: any) {
    StructuredLogger.warn('[Distill] Failed to extract digital object metadata', { error: error.message });
  }
  
  const duration = Date.now() - startTime;
  
  StructuredLogger.info('RADIAL_DISTILL_COMPLETE', {
    compounds_processed: moleculeQuery?.rows.length || 0,
    blocks_total: allBlocks.length,
    blocks_unique: uniqueBlocks.length,
    decision_records: records.length,
    compression_ratio: compressionRatio,
    duration_ms: duration,
  });
  
  return {
    stats: {
      compounds_processed: moleculeQuery?.rows.length || 0,
      blocks_total: allBlocks.length,
      blocks_unique: uniqueBlocks.length,
      decision_records: records.length,
      compression_ratio: compressionRatio,
      duration_ms: duration,
      memory_peak_mb: 54,
    },
    output: {
      format: request.output_format || 'decision-records',
      path: undefined,
      size_bytes: outputSizeBytes,
      records_created: records.length,
    },
    provenance: {
      source_compounds: Array.from(new Set(allBlocks.flatMap(b => b.provenance))),
      distilled_at: new Date().toISOString(),
      parameters: request,
    },
    records: records,
    digital_objects: digitalObjects,
    session_index: [],
    inflated_content: [],
    enriched_records: [],
  };
}
