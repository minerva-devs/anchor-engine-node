/**
 * Radial Distiller v2.0 — Decision Record Output
 *
 * Three-phase pipeline for semantic corpus compression:
 * 1. COLLECT: Extract semantic blocks (headings, sections)
 * 2. DEDUPLICATE: Block-level deduplication with SimHash (using @rbalchii/native-fingerprint)
 * 3. REASSEMBLE: Build Decision Record JSON output
 *
 * Prevents self-contamination by filtering distilled_* files
 */

import { db } from '../../core/db.js';
import { ContextInflator } from '../search/context-inflator.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { pathManager } from '../../utils/path-manager.js';
import { getMirrorPath } from '../mirror/mirror.js';
import { recordDistill } from './distill-manager.js';
import { wasmModuleLoader } from '../../utils/wasm-module-loader.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { execSync } from 'child_process';

// Configuration
const PGLITE_CHUNK_IDS = 100;
const MOBILE_MEMORY_THRESHOLD = 500 * 1024 * 1024;

// Filtering patterns to prevent self-contamination
const DISTILLATION_OUTPUT_PATTERNS = [
  /distilled_.*\.(yaml|json|md)$/i,
  /MASTER_DISTILLED_.*\.(yaml|json|md)$/i,
  /_distilled_.*\.(yaml|json|md)$/i,
];

/**
 * Check if a file should be excluded (distillation output)
 */
function isDistillationOutput(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return DISTILLATION_OUTPUT_PATTERNS.some(pattern => pattern.test(fileName));
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
 * Universal Digital Object Metadata
 * Captures file-agnostic metadata for any digital object
 */
export interface DigitalObjectMetadata {
  // Core identity (always present)
  id: string;                   // Unique identifier (hash or UUID)
  source_path: string;          // Original file path
  source_type: string;          // File extension or format hint (jsonl, md, ts, etc.)
  
  // Temporal (always present for filesystem objects)
  created_at?: string;          // File creation time (ISO)
  modified_at: string;          // File mtime (ISO)
  ingested_at: string;          // When added to Anchor Engine (ISO)
  
  // Provenance (always present)
  bucket: string;               // Source bucket (inbox, external-inbox, etc.)
  compound_id: string;          // Database compound ID
  
  // Content metadata (always calculable)
  size_bytes: number;           // File size
  line_count?: number;          // Line count (for text files)
  char_count?: number;          // Character count
  
  // Semantic metadata (extracted during distillation)
  topics?: string[];            // Extracted topics/themes
  entities?: string[];          // Named entities found
  tags?: string[];              // Assigned tags
}

/**
 * Chat Session Metadata (extends digital object with session-specific data)
 * Only populated when source_type === 'jsonl' and bucket === 'inbox'
 */
export interface ChatSessionMetadata extends DigitalObjectMetadata {
  session_id: string;           // UUID from JSONL filename
  session_start: string;        // First message timestamp
  session_end: string;          // Last message timestamp
  commands: string[];           // Slash commands run (/auth, /model, etc.)
  message_count: number;        // Total messages
  participants: string[];       // Roles observed (user, assistant, system)
  models_used?: string[];       // LLM models referenced
}

/**
 * Session Index Entry (for query routing)
 * Derived from ChatSessionMetadata, optimized for search
 */
export interface SessionIndexEntry {
  session_id: string;           // UUID for targeted queries
  date: string;                 // Session start date
  commands: string[];           // Commands for command-based queries
  topics: string[];             // Topics for semantic queries
  full_log_path: string;        // Path for direct file access
  message_count: number;        // For filtering by session size
  participants: string[];       // For filtering by interaction type
}

export interface RadialDistillRequest {
  seed?: {
    query?: string;
    compound_ids?: string[];
    buckets?: string[];
    tags?: string[];  // New: tag-based distillation mode
  };
  radius?: number;
  max_radius?: number;
  output_format?: 'yaml' | 'json' | 'decision-records' | 'json-full' | 'nested-yaml';
  output_path?: string;
  export_to_inbox?: boolean;
  auto_save?: boolean;
  mode?: 'standard' | 'tag-based';  // New: distillation mode
  dry_run?: boolean;                 // New: preview without writing
  similarity_threshold?: number;     // New: aggregation aggressiveness (0.0-1.0, default 0.85)
}

export interface RadialDistillResult {
  stats: {
    compounds_processed: number;
    blocks_total: number;
    blocks_unique: number;
    decision_records: number;
    compression_ratio: string;
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
  // Decision records (the actual distilled content)
  records?: DecisionRecord[];
  // NEW: Enriched records with temporal, memory_type, and aggregation metadata
  enriched_records?: EnrichedDecisionRecord[];
  // Digital object metadata for all processed compounds
  digital_objects?: DigitalObjectMetadata[];
  // Session index (subset of digital_objects for chat sessions)
  session_index?: SessionIndexEntry[];
  // Inflated content for tag-based mode (full atom content)
  inflated_content?: { content: string; source: string; tags: string[]; timestamp: number; }[];
}

/**
 * Extract semantic blocks from markdown text
 * Splits on headings and detects section types
 */
function extractSemanticBlocks(content: string, sourcePath: string, mtime: number): SemanticBlock[] {
  const blocks: SemanticBlock[] = [];
  const lines = content.split('\n');
  
  let currentBlock: string[] = [];
  let currentType: SemanticBlock['type'] = 'content';
  let currentLevel = 0;
  let currentHeading = '';
  
  const headingPattern = /^(#{1,6})\s+(.+)$/;
  const typeKeywords: Record<string, SemanticBlock['type']> = {
    'problem': 'problem',
    'issue': 'problem',
    'challenge': 'problem',
    'solution': 'solution',
    'approach': 'solution',
    'implementation': 'solution',
    'rationale': 'rationale',
    'why': 'rationale',
    'reason': 'rationale',
    'status': 'status',
    'state': 'status',
  };
  
  function saveBlock() {
    if (currentBlock.length > 0) {
      const blockContent = currentBlock.join('\n').trim();
      if (blockContent) {
        const simhash = computeSimHash(blockContent);
        blocks.push({
          id: crypto.createHash('sha256').update(blockContent).digest('hex').substring(0, 16),
          type: currentType,
          content: blockContent,
          heading: currentHeading || undefined,
          level: currentLevel,
          provenance: [sourcePath],
          mtime,
          simhash,
          tags: extractTags(blockContent),
        });
      }
    }
  }
  
  for (const line of lines) {
    const headingMatch = line.match(headingPattern);
    
    if (headingMatch) {
      // Save previous block
      saveBlock();
      
      // Start new block
      currentLevel = headingMatch[1].length;
      currentHeading = headingMatch[2].trim();
      currentBlock = [line];
      
      // Detect type from heading
      const headingLower = currentHeading.toLowerCase();
      currentType = 'content';
      for (const [keyword, type] of Object.entries(typeKeywords)) {
        if (headingLower.includes(keyword)) {
          currentType = type;
          break;
        }
      }
      
      // Override for heading levels
      if (currentLevel === 1) currentType = 'heading1';
      else if (currentLevel === 2) currentType = 'heading2';
      else if (currentLevel === 3) currentType = 'heading3';
    } else {
      currentBlock.push(line);
    }
  }
  
  // Save last block
  saveBlock();
  
  return blocks;
}

/**
 * Compute SimHash for a block using WASM module (Rust-compiled)
 */
function computeSimHash(text: string): string {
  // Use WASM fingerprint module (Rust-compiled, works on all platforms)
  try {
    const hash = wasmModuleLoader.fingerprint(text);
    // Convert bigint to hex string (16 chars = 64 bits)
    if (hash && typeof hash === 'bigint') {
      return hash.toString(16).padStart(16, '0').substring(0, 16);
    }
  } catch (e: any) {
    // Silent fallback - WASM not available on all platforms
  }
  
  // Fallback: deterministic hash using crypto
  const hash = crypto.createHash('sha256').update(text.toLowerCase().replace(/\s+/g, ' ')).digest('hex');
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
 * Deduplicate blocks by SimHash within same type
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
 * Assemble Decision Records from blocks
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

// ============================================================================
// NEW: Temporal Metadata Cascade (content → git → filename → mtime)
// ============================================================================

/**
 * Extract temporal metadata via cascade fallback
 * 1. Content-internal dates (ISO 8601, frontmatter)
 * 2. Git history (if .git exists and file is tracked)
 * 3. Filename patterns (2025-07-04_session.md, 20251119_notes.txt)
 * 4. File mtime (fallback)
 */
function extractTemporalMetadata(content: string, sourcePath: string, mtime: number): TemporalMetadata {
  // 1. Content-internal dates
  const isoDateMatch = content.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
  if (isoDateMatch) {
    return { primary: isoDateMatch[1], fallback_source: 'content' };
  }

  // Frontmatter date
  const frontmatterDateMatch = content.match(/^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m);
  if (frontmatterDateMatch) {
    return { primary: frontmatterDateMatch[1], fallback_source: 'content' };
  }

  // 2. Git history (graceful degradation — skip if git unavailable)
  try {
    const gitLog = execSync(`git log -1 --format="%ai" -- "${sourcePath}"`, {
      cwd: pathManager.getNotebookDir(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 3000,
    });
    const gitDateMatch = gitLog.match(/(\d{4}-\d{2}-\d{2})/);
    if (gitDateMatch) {
      return { primary: gitDateMatch[1], fallback_source: 'git' };
    }
  } catch {
    // Git unavailable or file not tracked — proceed to filename fallback
    StructuredLogger.debug('[Distill] Git log unavailable, proceeding to filename fallback', { sourcePath });
  }

  // 3. Filename patterns
  const fileName = path.basename(sourcePath);
  const fileNameDateMatch = fileName.match(/(\d{4})[-_]?(\d{2})[-_]?(\d{2})/);
  if (fileNameDateMatch) {
    const date = `${fileNameDateMatch[1]}-${fileNameDateMatch[2]}-${fileNameDateMatch[3]}`;
    return { primary: date, fallback_source: 'filename' };
  }

  // 4. File mtime (fallback)
  const mtimeDate = new Date(mtime).toISOString().split('T')[0];
  return { primary: mtimeDate, fallback_source: 'mtime' };
}

// ============================================================================
// NEW: Memory Type Inference
// ============================================================================

/**
 * Infer memory type from content and source path
 */
function inferMemoryType(content: string, sourcePath: string): MemoryType {
  const text = (content + ' ' + sourcePath).toLowerCase();

  // Episodic: time-bound events, meetings, tasks, people
  if (/\b(meeting|call|deadline|today|tomorrow|yesterday|this week|next week)\b/.test(text)) {
    return 'episodic';
  }
  // Check for person names in conversational context
  if (/\b(meeting with|talked to|asked|Carmen|Katie|Caitlin|Dory|Rob)\b/.test(text)) {
    return 'episodic';
  }
  // Check for date-bound work logs
  if (/\b(\d{4}-\d{2}-\d{2}.*said|noted|assigned|agreed)\b/.test(text)) {
    return 'episodic';
  }

  // Procedural: how-to, workflows, code patterns, protocols
  if (/\b(fix|workflow|protocol|step|implement|setup|install|configure|deploy|script)\b/.test(text)) {
    return 'procedural';
  }

  // Metacognitive: self-reflection, learning, strategy
  if (/\b(reflection|learned|realized|strategy|approach|thinking about|should have)\b/.test(text)) {
    return 'metacognitive';
  }

  // Default: semantic (concepts, architecture, decisions)
  return 'semantic';
}

// ============================================================================
// NEW: Semantic Deduplication Across Sources
// ============================================================================

/**
 * Deduplicate decision records across source files
 * Groups records by title similarity + shared tags, merges with frequency count
 * @param records Decision records to deduplicate
 * @param similarityThreshold Hamming distance threshold for SimHash similarity (default 0.85)
 */
function deduplicateAcrossSources(
  records: DecisionRecord[],
  similarityThreshold: number = 0.85,
): EnrichedDecisionRecord[] {
  const enrichedRecords: EnrichedDecisionRecord[] = [];
  const used = new Set<number>();

  for (let i = 0; i < records.length; i++) {
    if (used.has(i)) continue;

    const record = records[i];
    const related: { index: number; record: DecisionRecord }[] = [];

    // Find similar records
    for (let j = i + 1; j < records.length; j++) {
      if (used.has(j)) continue;

      const other = records[j];

      // Check title similarity (exact match or high overlap)
      const titleSim = computeTitleSimilarity(record.title, other.title);
      if (titleSim < similarityThreshold) continue;

      // Check shared tags
      const sharedTags = record.tags.filter(t => other.tags.includes(t)).length;
      const tagOverlap = sharedTags / Math.max(record.tags.length, other.tags.length, 1);
      if (tagOverlap < 0.3 && titleSim < 0.95) continue;  // Need either high title sim OR tag overlap

      related.push({ index: j, record: other });
      used.add(j);
    }

    // Merge related records into enriched record
    const allProvenance = [...record.provenance];
    const allTags = [...new Set([...record.tags, ...related.flatMap(r => r.record.tags)])];

    for (const rel of related) {
      for (const prov of rel.record.provenance) {
        if (!allProvenance.includes(prov)) allProvenance.push(prov);
      }
    }

    const enriched: EnrichedDecisionRecord = {
      ...record,
      tags: allTags,
      provenance: allProvenance,
      temporal: extractTemporalMetadata(
        [record.problem, ...(record.solution || []), record.rationale].filter(Boolean).join('\n') || record.title,
        record.provenance[0] || '',
        new Date(record.timestamp).getTime(),
      ),
      memory_type: inferMemoryType(
        [record.problem, ...(record.solution || []), record.rationale].filter(Boolean).join('\n'),
        record.provenance[0] || '',
      ),
      frequency: related.length + 1,
      source_files: Array.from(new Set(allProvenance.map(p => path.basename(p)))),
      related_entries: related.length > 0 ? related.map(r => r.record.id) : undefined,
    };

    enrichedRecords.push(enriched);
  }

  return enrichedRecords;
}

/**
 * Compute title similarity (0.0-1.0) using word overlap
 */
function computeTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));

  let overlap = 0;
  for (const w of words1) {
    if (words2.has(w)) overlap++;
  }

  return overlap / Math.max(words1.size, words2.size, 1);
}

// ============================================================================
// NEW: Nested YAML v2 Emitter
// ============================================================================

/**
 * Emit nested YAML v2 format grouped by source → temporal → semantic
 */
function emitNestedYaml(
  enrichedRecords: EnrichedDecisionRecord[],
  stats: RadialDistillResult['stats'],
): string {
  // Group by source file
  const bySource = new Map<string, EnrichedDecisionRecord[]>();
  for (const rec of enrichedRecords) {
    const sourceFile = rec.source_files?.[0] || path.basename(rec.provenance[0] || 'unknown');
    if (!bySource.has(sourceFile)) bySource.set(sourceFile, []);
    bySource.get(sourceFile)!.push(rec);
  }

  const yamlObj = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    summary: {
      compression_ratio: stats.compression_ratio,
      blocks_total: stats.blocks_total,
      blocks_unique: stats.blocks_unique,
      distilled_entries: enrichedRecords.length,
      duration_ms: stats.duration_ms,
    },
    sources: Array.from(bySource.entries()).map(([sourceFile, records]) => ({
      file: sourceFile,
      temporal_hint: records[0]?.temporal?.primary || 'unknown',
      entries: records.map(rec => ({
        id: rec.id,
        title: rec.title,
        frequency: rec.frequency || 1,
        source_files: rec.source_files || [],
        content: [
          rec.problem ? `Problem: ${rec.problem}` : '',
          rec.solution?.length ? `Solution:\n${rec.solution.join('\n')}` : '',
          rec.rationale ? `Why: ${rec.rationale}` : '',
        ].filter(Boolean).join('\n\n') || rec.title,
        score: 1.0,
        tags: rec.tags,
        memory_type: rec.memory_type,
        temporal: rec.temporal,
      })),
    })),
  };

  return yaml.dump(yamlObj, { lineWidth: -1, noRefs: true });
}

// ============================================================================
// NEW: JSON-Full Emitter (full content preservation)
// ============================================================================

/**
 * Emit JSON with full inflated content from tag-based mode
 */
function emitJsonFull(
  enrichedRecords: EnrichedDecisionRecord[],
  inflatedContent: { content: string; source: string; tags: string[]; timestamp: number; }[],
  stats: RadialDistillResult['stats'],
): Record<string, unknown> {
  return {
    version: '2.0',
    generated_at: new Date().toISOString(),
    summary: {
      compression_ratio: stats.compression_ratio,
      blocks_total: stats.blocks_total,
      blocks_unique: stats.blocks_unique,
      distilled_entries: enrichedRecords.length,
      full_content_entries: inflatedContent.length,
      duration_ms: stats.duration_ms,
    },
    records: enrichedRecords,
    inflated_content: inflatedContent.map(item => ({
      source: item.source,
      tags: item.tags,
      timestamp: new Date(item.timestamp).toISOString(),
      content: item.content,
    })),
  };
}

/**
 * Extract digital object metadata from a compound
 * Works for any file type, with special handling for chat JSONL files
 */
function extractDigitalObjectMetadata(
  compound: any,
  content: string,
  mtime: number,
  ingestedAt: string,
): DigitalObjectMetadata {
  const pathExt = path.extname(compound.path).toLowerCase();
  const sourceType = pathExt.slice(1) || 'unknown';
  
  // Base metadata (always present)
  const metadata: DigitalObjectMetadata = {
    id: crypto.createHash('sha256').update(compound.path).digest('hex').substring(0, 16),
    source_path: compound.path,
    source_type: sourceType,
    modified_at: new Date(mtime).toISOString(),
    ingested_at: ingestedAt,
    bucket: compound.provenance || 'unknown',
    compound_id: compound.id,
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
 * Extract chat session metadata from JSONL content
 * Returns ChatSessionMetadata if valid chat session, null otherwise
 */
function extractChatSessionMetadata(
  baseMetadata: DigitalObjectMetadata,
  content: string,
  compound: any,
): ChatSessionMetadata | null {
  // Only process JSONL files from inbox
  if (baseMetadata.source_type !== 'jsonl' || !baseMetadata.bucket.includes('inbox')) {
    return null;
  }
  
  // Extract session_id from filename (UUID pattern)
  const filename = path.basename(compound.path, '.jsonl');
  const sessionUuidMatch = filename.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  if (!sessionUuidMatch) {
    return null;
  }
  
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return null;
  }
  
  // Parse messages
  const messages: any[] = [];
  const commands: string[] = [];
  const participants = new Set<string>();
  const modelsUsed = new Set<string>();
  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  
  for (const line of lines) {
    try {
      const msg = JSON.parse(line);
      messages.push(msg);
      
      // Track timestamps
      if (msg.timestamp) {
        if (!firstTimestamp) firstTimestamp = msg.timestamp;
        lastTimestamp = msg.timestamp;
      }
      
      // Track participants
      if (msg.type) participants.add(msg.type);
      if (msg.role) participants.add(msg.role);
      
      // Track commands
      if (msg.subtype === 'slash_command' && msg.systemPayload?.rawCommand) {
        const cmd = msg.systemPayload.rawCommand;
        if (!commands.includes(cmd)) {
          commands.push(cmd);
        }
      }
      
      // Track models
      if (msg.model) {
        modelsUsed.add(msg.model);
      }
    } catch {
      // Skip malformed lines
    }
  }
  
  return {
    ...baseMetadata,
    session_id: filename,
    session_start: firstTimestamp || baseMetadata.modified_at,
    session_end: lastTimestamp || baseMetadata.modified_at,
    commands,
    message_count: messages.length,
    participants: Array.from(participants),
    models_used: Array.from(modelsUsed),
  };
}

/**
 * Build session index from chat session metadata
 */
function buildSessionIndex(chatSessions: ChatSessionMetadata[]): SessionIndexEntry[] {
  return chatSessions.map(session => ({
    session_id: session.session_id,
    date: session.session_start,
    commands: session.commands,
    topics: session.topics || [],
    full_log_path: session.source_path,
    message_count: session.message_count,
    participants: session.participants,
  }));
}

/**
 * Fetch all unique tags from the database
 * A/B Tests: tags junction table vs atoms.tags[] array
 */
export async function fetchAllTags(): Promise<string[]> {
  try {
    // Source A: tags junction table
    const tagsTableResult = await db.run('SELECT DISTINCT tag FROM tags WHERE tag IS NOT NULL ORDER BY tag');
    const tagsTableCount = tagsTableResult.rows?.length || 0;

    // Source B: atoms.tags[] array (TEXT[])
    const atomsTagsResult = await db.run('SELECT DISTINCT UNNEST(tags) as tag FROM atoms WHERE tags IS NOT NULL AND tags != \'{}\' ORDER BY tag');
    const atomsTagsCount = atomsTagsResult.rows?.length || 0;

    // A/B Test logging
    console.log(`[A/B Test][fetchAllTags] Source A (tags table): ${tagsTableCount} | Source B (atoms.tags[]): ${atomsTagsCount}`);

    // Use whichever source has data (prefer atoms.tags[] as primary)
    if (atomsTagsCount > 0) {
      const allTags = new Set<string>();
      if (atomsTagsResult.rows) {
        for (const row of atomsTagsResult.rows) {
          if (row.tag) allTags.add(row.tag as string);
        }
      }
      return [...allTags].sort();
    }

    // Fallback to tags table
    if (tagsTableCount > 0) {
      const allTags = new Set<string>();
      if (tagsTableResult.rows) {
        for (const row of tagsTableResult.rows) {
          if (row.tag) allTags.add(row.tag as string);
        }
      }
      return [...allTags].sort();
    }

    return [];
  } catch (error) {
    console.error('[fetchAllTags] Error:', error);
    return [];
  }
}

/**
 * Fetch all atoms for a specific tag with full content
 * A/B Tests: tags junction table vs atoms.tags[] array containment
 */
export async function fetchAtomsByTag(tag: string): Promise<any[]> {
  try {
    // Source A: tags junction table
    const tagsTableResult = await db.run(
      'SELECT atom_id FROM tags WHERE tag = $1',
      [tag]
    );
    const tagsTableCount = tagsTableResult.rows?.length || 0;

    // Source B: atoms.tags[] array containment
    const atomsTagsResult = await db.run(
      'SELECT id FROM atoms WHERE $1 = ANY(tags)',
      [tag]
    );
    const atomsTagsCount = atomsTagsResult.rows?.length || 0;

    // A/B Test logging (sample every 10th call to reduce noise)
    if (Math.random() < 0.1) {
      console.log(`[A/B Test][fetchAtomsByTag][${tag}] Source A (tags table): ${tagsTableCount} | Source B (atoms.tags[]): ${atomsTagsCount}`);
    }

    // Collect atom IDs from both sources
    const atomIds = new Set<string>();

    if (tagsTableResult.rows) {
      for (const row of tagsTableResult.rows) {
        if (row.atom_id) atomIds.add(row.atom_id);
      }
    }

    if (atomsTagsResult.rows) {
      for (const row of atomsTagsResult.rows) {
        if (row.id) atomIds.add(row.id);
      }
    }

    if (atomIds.size === 0) {
      return [];
    }

    // Fetch atoms with their content - use 'buckets' (plural) not 'bucket'
    const atomsResult = await db.run(
      'SELECT id, content, source_path, tags, buckets FROM atoms WHERE id = ANY($1)',
      [Array.from(atomIds)]
    );

    return atomsResult.rows || [];
  } catch (error) {
    console.error(`[fetchAtomsByTag] Error for tag ${tag}:`, error);
    return [];
  }
}

/**
 * Tag-based distillation mode
 * Iterates through all tags, fetches all content for each tag, and deduplicates
 * Uses ContextInflator.inflate() to get full atom content (like v5.0.0)
 */
async function tagBasedDistill(request: RadialDistillRequest): Promise<{
  blocks: SemanticBlock[];
  digitalObjects: DigitalObjectMetadata[];
  compoundsProcessed: number;
  inflatedContent: { content: string; source: string; tags: string[]; timestamp: number; }[];
}> {
  const allBlocks: SemanticBlock[] = [];
  const digitalObjects: DigitalObjectMetadata[] = [];
  const inflatedContent: { content: string; source: string; tags: string[]; timestamp: number; }[] = [];
  let compoundsProcessed = 0;
  const ingestedAt = new Date().toISOString();

  // Get tags to process (all tags or specified subset)
  let tagsToProcess = request.seed?.tags;

  if (!tagsToProcess || tagsToProcess.length === 0) {
    // Fetch all tags if not specified
    tagsToProcess = await fetchAllTags();
    StructuredLogger.info('[TagBasedDistill] Processing all tags', { count: tagsToProcess.length });
  } else {
    StructuredLogger.info('[TagBasedDistill] Processing specified tags', { count: tagsToProcess.length });
  }

  // Track processed atoms to avoid duplicates across tags
  const processedAtomIds = new Set<string>();

  // Process each tag
  for (const tag of tagsToProcess) {
    const atoms = await fetchAtomsByTag(tag);

    for (const atom of atoms) {
      // Skip if already processed (dedup across tags)
      if (processedAtomIds.has(atom.id)) {
        continue;
      }
      processedAtomIds.add(atom.id);

      // Skip distillation outputs
      if (isDistillationOutput(atom.source_path)) {
        continue;
      }

      compoundsProcessed++;

      // Get content from mirrored_brain filesystem (Standard 051 - Pointer Only)
      // This is the v5.0.0 approach that works reliably
      let content = '';
      
      // Normalize provenance for getMirrorPath
      let prov = atom.provenance || 'external';
      if (prov.includes('external')) prov = 'external';
      else if (prov.includes('quarantine')) prov = 'quarantine';
      else prov = 'internal';
      
      const mirrorPath = getMirrorPath(atom.source_path || '', prov);
      
      // Try mirrored_brain first
      if (mirrorPath && fs.existsSync(mirrorPath)) {
        content = fs.readFileSync(mirrorPath, 'utf-8');
      } else {
        // Fallback: try notebook directory
        const notebookDir = pathManager.getNotebookDir();
        const localPath = path.join(notebookDir, atom.source_path || '');
        if (fs.existsSync(localPath)) {
          content = fs.readFileSync(localPath, 'utf-8');
        }
      }

      // Skip if no content found
      if (!content) {
        console.warn(`[TagBasedDistill] No content found for atom ${atom.id} at ${atom.source_path}`);
        continue;
      }

      // Add to inflated content
      inflatedContent.push({
        content,
        source: atom.source_path || `atom:${atom.id}`,
        tags: atom.tags || [],
        timestamp: atom.timestamp || Date.now()
      });

      // Extract semantic blocks
      const mtime = atom.timestamp || Date.now();
      const blocks = extractSemanticBlocks(content, atom.source_path || `atom:${atom.id}`, mtime);

      for (const block of blocks) {
        if (!block.tags) block.tags = [];
        if (!block.tags.includes(tag)) {
          block.tags.push(tag);
        }
      }

      allBlocks.push(...blocks);

      // Extract digital object metadata
      const baseMetadata = extractDigitalObjectMetadata(
        { id: atom.id, path: atom.source_path, provenance: atom.bucket },
        content,
        mtime,
        ingestedAt
      );
      digitalObjects.push(baseMetadata);
    }
  }

  return {
    blocks: allBlocks,
    digitalObjects,
    compoundsProcessed,
    inflatedContent,
  };
}

/**
 * Finalize distillation - common pipeline for both standard and tag-based modes
 */
async function finalizeDistillation(
  request: RadialDistillRequest,
  allBlocks: SemanticBlock[],
  digitalObjects: DigitalObjectMetadata[],
  chatSessions: ChatSessionMetadata[],
  compoundsProcessed: number,
  startTime: number,
  ingestedAt: string,
  inflatedContent?: { content: string; source: string; tags: string[]; timestamp: number; }[],
): Promise<RadialDistillResult> {
  // Build session index from chat sessions
  const sessionIndex = buildSessionIndex(chatSessions);

  // Phase 2: DEDUPLICATE - Block-level deduplication
  const uniqueBlocks = deduplicateBlocks(allBlocks);

  // Phase 3: REASSEMBLE - Build Decision Records
  const decisionRecords = assembleDecisionRecords(uniqueBlocks);

  // Phase 3.5: SEMANTIC DEDUPLICATION (NEW) - Cross-source aggregation
  const similarityThreshold = request.similarity_threshold ?? config.DISTILLER.SIMILARITY_THRESHOLD ?? 0.85;
  const enrichedRecords = deduplicateAcrossSources(decisionRecords, similarityThreshold);

  StructuredLogger.info('DISTILL_AGGREGATION', {
    before: decisionRecords.length,
    after: enrichedRecords.length,
    reduction: `${((1 - enrichedRecords.length / Math.max(1, decisionRecords.length)) * 100).toFixed(1)}%`,
    similarity_threshold: similarityThreshold,
  });

  // Dry-run mode: return preview without writing
  if (request.dry_run) {
    StructuredLogger.info('DISTILL_DRY_RUN', { records: enrichedRecords.length });
    return {
      stats: {
        compounds_processed: compoundsProcessed,
        blocks_total: allBlocks.length,
        blocks_unique: uniqueBlocks.length,
        decision_records: enrichedRecords.length,
        compression_ratio: `${(allBlocks.length / Math.max(1, enrichedRecords.length)).toFixed(1)}:1`,
        duration_ms: Date.now() - startTime,
        memory_peak_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
      output: {
        format: request.output_format || 'decision-records',
        size_bytes: 0,
        records_created: enrichedRecords.length,
      },
      provenance: {
        source_compounds: digitalObjects.map(d => d.source_path),
        distilled_at: new Date().toISOString(),
        parameters: request,
      },
      records: enrichedRecords as DecisionRecord[],
      digital_objects: digitalObjects,
      session_index: sessionIndex,
      inflated_content: inflatedContent || [],
      enriched_records: enrichedRecords,
    };
  }

  // Generate output
  const outputFormat = request.output_format || 'decision-records';
  let outputPath: string | undefined;
  let outputSize = 0;

  // Determine if we should save to file
  const shouldSaveToFile = request.output_path || request.auto_save;

  if (outputFormat === 'nested-yaml') {
    // NEW: Nested YAML v2 format
    const yamlOutput = emitNestedYaml(enrichedRecords, {
      compounds_processed: compoundsProcessed,
      blocks_total: allBlocks.length,
      blocks_unique: uniqueBlocks.length,
      decision_records: enrichedRecords.length,
      compression_ratio: `${(allBlocks.length / Math.max(1, enrichedRecords.length)).toFixed(1)}:1`,
      duration_ms: Date.now() - startTime,
      memory_peak_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
    outputSize = yamlOutput.length;

    if (shouldSaveToFile) {
      const distillsDir = path.join(pathManager.getNotebookDir(), 'distills');
      if (!fs.existsSync(distillsDir)) fs.mkdirSync(distillsDir, { recursive: true });
      outputPath = request.output_path || path.join(
        distillsDir,
        `distilled_nested_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`,
      );
      fs.writeFileSync(outputPath, yamlOutput);
    }
  } else if (outputFormat === 'json-full') {
    // NEW: JSON with full inflated content
    const jsonFullOutput = emitJsonFull(enrichedRecords, inflatedContent || [], {
      compounds_processed: compoundsProcessed,
      blocks_total: allBlocks.length,
      blocks_unique: uniqueBlocks.length,
      decision_records: enrichedRecords.length,
      compression_ratio: `${(allBlocks.length / Math.max(1, enrichedRecords.length)).toFixed(1)}:1`,
      duration_ms: Date.now() - startTime,
      memory_peak_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    });
    const jsonOutput = JSON.stringify(jsonFullOutput, null, 2);
    outputSize = jsonOutput.length;

    if (shouldSaveToFile) {
      const distillsDir = path.join(pathManager.getNotebookDir(), 'distills');
      if (!fs.existsSync(distillsDir)) fs.mkdirSync(distillsDir, { recursive: true });
      outputPath = request.output_path || path.join(
        distillsDir,
        `distilled_full_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      );
      fs.writeFileSync(outputPath, jsonOutput);
    }
  } else if (outputFormat === 'json' || outputFormat === 'decision-records') {
    // Include digital objects and session index in JSON output
    const fullOutput = {
      metadata: {
        source: 'Anchor Engine Radial Distiller v2.0',
        distilled_at: new Date().toISOString(),
        decision_records: enrichedRecords.length,
        digital_objects_count: digitalObjects.length,
        session_index_count: sessionIndex.length,
      },
      records: enrichedRecords,
      digital_objects: digitalObjects,
      session_index: sessionIndex,
    };
    const jsonOutput = JSON.stringify(fullOutput, null, 2);
    outputSize = jsonOutput.length;

    if (shouldSaveToFile) {
      const distillsDir = path.join(pathManager.getNotebookDir(), 'distills');
      if (!fs.existsSync(distillsDir)) fs.mkdirSync(distillsDir, { recursive: true });
      outputPath = request.output_path || path.join(
        distillsDir,
        `distilled_standards_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
      );
      fs.writeFileSync(outputPath, jsonOutput);
    }
  } else if (outputFormat === 'yaml') {
    // Backward compatibility - legacy YAML format
    const yamlOutput = yaml.dump({
      metadata: {
        source: 'Anchor Engine Radial Distiller v2.0',
        distilled_at: new Date().toISOString(),
        decision_records: enrichedRecords.length,
        digital_objects_count: digitalObjects.length,
        session_index_count: sessionIndex.length,
      },
      records: enrichedRecords,
      digital_objects: digitalObjects,
      session_index: sessionIndex,
    });

    outputSize = yamlOutput.length;

    if (shouldSaveToFile) {
      const distillsDir = path.join(pathManager.getNotebookDir(), 'distills');
      if (!fs.existsSync(distillsDir)) fs.mkdirSync(distillsDir, { recursive: true });
      outputPath = request.output_path || path.join(
        distillsDir,
        `distilled_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`,
      );
      fs.writeFileSync(outputPath, yamlOutput);
    }
  }

  const duration = Date.now() - startTime;

  const result: RadialDistillResult = {
    stats: {
      compounds_processed: compoundsProcessed,
      blocks_total: allBlocks.length,
      blocks_unique: uniqueBlocks.length,
      decision_records: enrichedRecords.length,
      compression_ratio: `${(allBlocks.length / Math.max(1, enrichedRecords.length)).toFixed(1)}:1`,
      duration_ms: duration,
      memory_peak_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    output: {
      format: outputFormat,
      path: outputPath,
      size_bytes: outputSize,
      records_created: enrichedRecords.length,
    },
    provenance: {
      source_compounds: digitalObjects.map(d => d.source_path),
      distilled_at: new Date().toISOString(),
      parameters: request,
    },
    // Return enriched decision records with temporal and memory type metadata
    records: enrichedRecords as DecisionRecord[],
    // Digital object metadata for all processed compounds
    digital_objects: digitalObjects,
    // Session index for chat sessions
    session_index: sessionIndex,
    // Inflated content for tag-based mode (full atom content)
    inflated_content: inflatedContent || [],
    // NEW: Enriched records with full metadata
    enriched_records: enrichedRecords,
  };

  StructuredLogger.info('RADIAL_DISTILL_V2_COMPLETE', {
    records: result.stats.decision_records,
    compression: result.stats.compression_ratio,
    aggregation_reduction: `${((1 - enrichedRecords.length / Math.max(1, decisionRecords.length)) * 100).toFixed(1)}%`,
    duration_ms: duration,
  });

  // Standard 016: Record distill in database with pointers to file
  try {
    if (outputPath) {
      const sourceSessions = sessionIndex.map((s: any) => s.session_id || s.id).filter(Boolean);
      const sourceFiles = digitalObjects.map(d => d.source_path);

      await recordDistill({
        timestamp: new Date().toISOString(),
        filename: path.basename(outputPath),
        file_path: outputPath,
        line_count: allBlocks.length,
        lines_unique: uniqueBlocks.length,
        compression_ratio: parseFloat(result.stats.compression_ratio.replace(':1', '')),
        source_sessions: sourceSessions,
        source_files: sourceFiles,
        parameters: {
          radius: request.radius,
          output_format: outputFormat,
          decision_records: enrichedRecords.length,
          digital_objects: digitalObjects.length,
          session_index: sessionIndex.length,
        },
      });
      console.log('[Distill] ✅ Distill recorded in database');
    }
  } catch (dbError: any) {
    console.warn('[Distill] Could not record distill in database:', dbError.message);
    // Don't fail the distill if DB recording fails
  }

  return result;
}

/**
 * Main distillation function
 */
export async function radialDistill(request: RadialDistillRequest): Promise<RadialDistillResult> {
  const startTime = Date.now();
  const ingestedAt = new Date().toISOString();

  StructuredLogger.info('RADIAL_DISTILL_V2', {
    endpoint: '/v1/memory/distill',
    format: request.output_format || 'decision-records',
    mode: request.mode || 'standard',
  });

  try {
    // Route to tag-based mode if requested
    if (request.mode === 'tag-based' || (request.seed?.tags && request.seed.tags.length > 0)) {
      const tagResult = await tagBasedDistill(request);

      // Continue with standard pipeline using tag-based results
      return finalizeDistillation(request, tagResult.blocks, tagResult.digitalObjects, [], tagResult.compoundsProcessed, startTime, ingestedAt, tagResult.inflatedContent);
    }

    // Phase 1: COLLECT - Extract semantic blocks and metadata (standard mode)
    const allBlocks: SemanticBlock[] = [];
    const digitalObjects: DigitalObjectMetadata[] = [];
    const chatSessions: ChatSessionMetadata[] = [];
    let compoundsProcessed = 0;

    // Get compounds from database or use provided IDs
    let compoundQuery = 'SELECT id, path, provenance FROM compounds';
    const params: any[] = [];

    if (request.seed?.compound_ids && request.seed.compound_ids.length > 0) {
      compoundQuery += ' WHERE id IN (' + request.seed.compound_ids.map(() => '?').join(',') + ')';
      params.push(...request.seed.compound_ids);
    } else if (request.seed?.buckets && request.seed.buckets.length > 0) {
      compoundQuery += ' WHERE provenance IN (' + request.seed.buckets.map(() => '?').join(',') + ')';
      params.push(...request.seed.buckets);
    }

    const compounds = (await db.run(compoundQuery, params)).rows || [];

    for (const compound of compounds) {
      // Skip distillation outputs (prevent self-contamination)
      if (isDistillationOutput(compound.path)) {
        continue;
      }

      compoundsProcessed++;

      // Get content from filesystem using compound.path (Standard 051 - Pointer Only)
      // compound.path is relative to NOTEBOOK_DIR (e.g., "external-inbox/github/owner/repo/file.md")
      let content = '';
      const notebookDir = pathManager.getNotebookDir();
      const localPath = path.join(notebookDir, compound.path);

      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, 'utf-8');
      } else {
        // File not found - skip this compound
        console.warn(`[RadialDistiller] Skipping compound ${compound.id}: file not found at ${localPath}`);
        continue;
      }

      // Get file mtime
      let mtime = Date.now();
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        mtime = stats.mtimeMs;
      }

      // Extract semantic blocks
      const blocks = extractSemanticBlocks(content, compound.path, mtime);
      allBlocks.push(...blocks);

      // Extract digital object metadata (NEW)
      const baseMetadata = extractDigitalObjectMetadata(compound, content, mtime, ingestedAt);
      digitalObjects.push(baseMetadata);

      // Extract chat session metadata if applicable (NEW)
      const chatMetadata = extractChatSessionMetadata(baseMetadata, content, compound);
      if (chatMetadata) {
        chatSessions.push(chatMetadata);
      }
    }

    return finalizeDistillation(request, allBlocks, digitalObjects, chatSessions, compoundsProcessed, startTime, ingestedAt);

  } catch (error: any) {
    StructuredLogger.error('RADIAL_DISTILL_V2_ERROR', error);
    throw error;
  }
}
