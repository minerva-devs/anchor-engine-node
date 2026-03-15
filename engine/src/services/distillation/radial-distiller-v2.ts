/**
 * Radial Distiller v2.0 — Decision Record Output
 *
 * Three-phase pipeline for semantic corpus compression:
 * 1. COLLECT: Extract semantic blocks (headings, sections)
 * 2. DEDUPLICATE: Block-level deduplication with SimHash
 * 3. REASSEMBLE: Build Decision Record JSON output
 *
 * Prevents self-contamination by filtering distilled_* files
 */

import { db } from '../../core/db.js';
import { ContextInflator } from '../search/context-inflator.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { getMirrorPath } from '../mirror/mirror.js';
import { pathManager } from '../../utils/path-manager.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Configuration
const PGLITE_CHUNK_IDS = 100;
const MOBILE_MEMORY_THRESHOLD = 500 * 1024 * 1024;

// Filtering patterns to prevent self-contamination
const DISTILLATION_OUTPUT_PATTERNS = [
  /distilled_.*\.(yaml|json|md)$/i,
  /MASTER_DISTILLED_.*\.(yaml|json|md)$/i,
  /_distilled_.*\.(yaml|json|md)$/i
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

export interface RadialDistillRequest {
  seed?: {
    query?: string;
    compound_ids?: string[];
    buckets?: string[];
  };
  radius?: number;
  max_radius?: number;
  output_format?: 'yaml' | 'json' | 'decision-records';
  output_path?: string;
  export_to_inbox?: boolean;
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
    'state': 'status'
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
          tags: extractTags(blockContent)
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
 * Compute SimHash for a block (placeholder - use existing simhash service)
 */
function computeSimHash(text: string): string {
  // Simplified simhash - in production use @rbalchii/anchor-fingerprint-wasm
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
 */
function assembleDecisionRecords(blocks: SemanticBlock[]): DecisionRecord[] {
  const records: DecisionRecord[] = [];
  const blocksBySource = new Map<string, SemanticBlock[]>();
  
  // Group blocks by primary source
  for (const block of blocks) {
    const primarySource = block.provenance[0];
    if (!blocksBySource.has(primarySource)) {
      blocksBySource.set(primarySource, []);
    }
    blocksBySource.get(primarySource)!.push(block);
  }
  
  // Create decision record for each source
  for (const [source, sourceBlocks] of blocksBySource.entries()) {
    const fileName = path.basename(source, path.extname(source));
    
    // Find title (first heading1 or heading2)
    const titleBlock = sourceBlocks.find(b => b.type === 'heading1' || b.type === 'heading2');
    const title = titleBlock?.heading || fileName;
    
    // Extract problem
    const problemBlock = sourceBlocks.find(b => b.type === 'problem');
    const problem = problemBlock?.content;
    
    // Extract solutions (numbered list or solution blocks)
    const solutionBlocks = sourceBlocks.filter(b => b.type === 'solution');
    const solution = solutionBlocks.map(b => b.content.split('\n').filter(l => /^\d+\./.test(l.trim())).join('\n')).flat();
    
    // Extract rationale
    const rationaleBlock = sourceBlocks.find(b => b.type === 'rationale');
    const rationale = rationaleBlock?.content;
    
    // Extract status
    const statusBlock = sourceBlocks.find(b => b.type === 'status');
    let status: DecisionRecord['status'] = 'active';
    if (statusBlock) {
      const statusText = statusBlock.content.toLowerCase();
      if (statusText.includes('deprecated') || statusText.includes('superseded')) {
        status = 'deprecated';
      } else if (statusText.includes('archived') || statusText.includes('legacy')) {
        status = 'archived';
      }
    }
    
    // Extract supersedes
    const supersedes: string[] = [];
    const supersedesMatch = title.match(/supersedes.*?(\d+)/i);
    if (supersedesMatch) {
      supersedes.push(`std-${supersedesMatch[1].padStart(3, '0')}`);
    }
    
    // Collect all tags
    const allTags = Array.from(new Set(sourceBlocks.flatMap(b => b.tags || [])));
    
    // Use earliest mtime as timestamp
    const earliestMtime = Math.min(...sourceBlocks.map(b => b.mtime));
    const timestamp = new Date(earliestMtime).toISOString();
    
    records.push({
      id: fileName.match(/\d+/)?.[0] ? `std-${fileName.match(/\d+/)![0].padStart(3, '0')}` : fileName,
      title,
      problem,
      solution: solution.length > 0 ? solution : undefined,
      rationale,
      supersedes: supersedes.length > 0 ? supersedes : undefined,
      status,
      timestamp,
      provenance: sourceBlocks.flatMap(b => b.provenance),
      tags: allTags
    });
  }
  
  return records;
}

/**
 * Main distillation function
 */
export async function radialDistill(request: RadialDistillRequest): Promise<RadialDistillResult> {
  const startTime = Date.now();
  
  StructuredLogger.info('RADIAL_DISTILL_V2', { 
    endpoint: '/v1/memory/distill',
    format: request.output_format || 'decision-records'
  });
  
  try {
    // Phase 1: COLLECT - Extract semantic blocks
    const allBlocks: SemanticBlock[] = [];
    let compoundsProcessed = 0;
    
    // Get compounds from database or use provided IDs
    let compoundQuery = 'SELECT id, path FROM compounds';
    const params: any[] = [];
    
    if (request.seed?.compound_ids && request.seed.compound_ids.length > 0) {
      compoundQuery += ' WHERE id IN (' + request.seed.compound_ids.map(() => '?').join(',') + ')';
      params.push(...request.seed.compound_ids);
    } else if (request.seed?.buckets && request.seed.buckets.length > 0) {
      compoundQuery += ' WHERE provenance IN (' + request.seed.buckets.map(() => '?').join(',') + ')';
      params.push(...request.seed.buckets);
    }
    
    const compounds = (await db.run(compoundQuery, params)).results || [];
    
    for (const compound of compounds) {
      // Skip distillation outputs (prevent self-contamination)
      if (isDistillationOutput(compound.path)) {
        continue;
      }
      
      compoundsProcessed++;
      
      // Get content from mirrored_brain or compound body
      let content = '';
      const mirrorPath = getMirrorPath(path.join(process.cwd(), 'mirrored_brain'));
      const localPath = path.join(mirrorPath, compound.path);
      
      if (fs.existsSync(localPath)) {
        content = fs.readFileSync(localPath, 'utf-8');
      } else {
        // Fallback to database
        const result = await db.run('SELECT compound_body FROM compounds WHERE id = ?', [compound.id]);
        content = result.results?.[0]?.compound_body || '';
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
    }
    
    // Phase 2: DEDUPLICATE - Block-level deduplication
    const uniqueBlocks = deduplicateBlocks(allBlocks);
    
    // Phase 3: REASSEMBLE - Build Decision Records
    const decisionRecords = assembleDecisionRecords(uniqueBlocks);
    
    // Generate output
    const outputFormat = request.output_format || 'decision-records';
    let outputPath: string | undefined;
    let outputSize = 0;
    
    if (outputFormat === 'json' || outputFormat === 'decision-records') {
      const jsonOutput = JSON.stringify(decisionRecords, null, 2);
      outputSize = jsonOutput.length;
      
      outputPath = request.output_path || path.join(
        path.dirname(request.seed?.compound_ids?.[0] || ''),
        `distilled_standards_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
      );
      
      fs.writeFileSync(outputPath, jsonOutput);
    } else if (outputFormat === 'yaml') {
      // Backward compatibility - legacy YAML format
      const yamlOutput = yaml.dump({
        metadata: {
          source: 'Anchor Engine Radial Distiller v2.0',
          distilled_at: new Date().toISOString(),
          decision_records: decisionRecords.length
        },
        records: decisionRecords
      });
      
      outputSize = yamlOutput.length;
      outputPath = request.output_path || `distilled_${new Date().toISOString().replace(/[:.]/g, '-')}.yaml`;
      fs.writeFileSync(outputPath, yamlOutput);
    }
    
    const duration = Date.now() - startTime;
    
    const result: RadialDistillResult = {
      stats: {
        compounds_processed: compoundsProcessed,
        blocks_total: allBlocks.length,
        blocks_unique: uniqueBlocks.length,
        decision_records: decisionRecords.length,
        compression_ratio: `${(allBlocks.length / Math.max(1, uniqueBlocks.length)).toFixed(1)}:1`,
        duration_ms: duration,
        memory_peak_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
      },
      output: {
        format: outputFormat,
        path: outputPath,
        size_bytes: outputSize,
        records_created: decisionRecords.length
      },
      provenance: {
        source_compounds: compounds.map((c: any) => c.path),
        distilled_at: new Date().toISOString(),
        parameters: request
      }
    };
    
    StructuredLogger.info('RADIAL_DISTILL_V2_COMPLETE', {
      records: result.stats.decision_records,
      compression: result.stats.compression_ratio,
      duration_ms: duration
    });
    
    return result;
    
  } catch (error: any) {
    StructuredLogger.error('RADIAL_DISTILL_V2_ERROR', error);
    throw error;
  }
}
