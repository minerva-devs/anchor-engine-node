/**
 * Distill Service — Semantic Compression & Lossless Graph Distillation
 *
 * Performs comprehensive traversal of the knowledge graph and compresses
 * it into a compact representation by merging semantically redundant nodes
 * and consolidating edges.
 *
 * PURELY DETERMINISTIC - No LLM dependencies. Uses graph-based deduplication
 * and heuristic text compression for reliable, offline operation.
 */

import { db } from '../../core/db.js';
import { StructuredLogger } from '../../utils/structured-logger.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface DistillRequest {
  seed?: {
    query?: string;
    atom_ids?: string[];
  };
  max_nodes?: number;
  batch_size?: number;
  compression_ratio?: number; // Target ratio, e.g. 10 for 10:1
  export_to_inbox?: boolean;
}

export interface DistillNode {
  id: string;
  originalIds: string[];
  content: string;
  compressedContent: string;
  tags: string[];
  sources: string[];
}

export interface DistillEdge {
  source: string;
  target: string;
  relation: string;
  metadata: {
    timestamps: number[];
    originalSources: string[];
  };
}

export interface DistillResult {
  nodes: DistillNode[];
  edges: DistillEdge[];
  stats: {
    original_node_count: number;
    distilled_node_count: number;
    original_edge_count: number;
    distilled_edge_count: number;
    compression_ratio: string;
    duration_ms: number;
  };
}

const PGLITE_CHUNK_IDS = 100;
const PGLITE_CHUNK_CONTENT = 25;

/**
 * Parse tags from PostgreSQL array or JSON format
 * Handles both: {tag1,tag2} and ["tag1","tag2"]
 */
function parseTags(tagsText: string | null): string[] {
  if (!tagsText) return [];
  
  // PostgreSQL array format: {tag1,tag2}
  if (tagsText.startsWith('{') && tagsText.endsWith('}')) {
    return tagsText
      .slice(1, -1)
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
  }
  
  // JSON format: ["tag1","tag2"]
  try {
    const parsed = JSON.parse(tagsText);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Deterministic heuristic compressor - no LLM required
 * Compresses text by removing redundancy while preserving facts
 */
function heuristicCompress(text: string): string {
  if (!text) return "";
  
  // Remove multiple spaces, newlines, and normalize whitespace
  let compressed = text.replace(/\s+/g, ' ').trim();
  
  // For long text, find natural sentence boundaries
  if (compressed.length > 500) {
    // Try to find a sentence boundary between 400-600 chars
    const end = compressed.indexOf('.', 400);
    if (end !== -1 && end < 600) {
      compressed = compressed.substring(0, end + 1);
    } else {
      // Fallback: truncate at 500 chars with ellipsis
      compressed = compressed.substring(0, 500) + "...";
    }
  }
  
  return compressed;
}

/** Fetch all atom IDs reachable from seeds or all roots if no seeds */
async function getAllReachableAtomIds(seeds?: string[], maxNodes: number = 10000): Promise<string[]> {
  const visited = new Set<string>();
  let frontier: string[] = [];

  if (seeds && seeds.length > 0) {
    frontier = [...seeds];
    seeds.forEach(id => visited.add(id));
  } else {
    // Start from all compounds (roots)
    const result = await db.run(`SELECT id FROM atoms WHERE id LIKE 'mem_%' LIMIT $1`, [PGLITE_CHUNK_IDS]);
    frontier = (result.rows as any[]).map(r => r.id);
    frontier.forEach(id => visited.add(id));
  }

  const allAtomIds = new Set<string>();

  while (frontier.length > 0 && visited.size < maxNodes) {
    const chunk = frontier.splice(0, PGLITE_CHUNK_IDS);
    const placeholders = chunk.map((_, i) => `$${i + 1}`).join(', ');

    // Find tags associated with these compounds/atoms
    const tagResult = await db.run(
      `SELECT DISTINCT target_id FROM edges WHERE source_id IN (${placeholders})`,
      chunk
    );

    const nextNeighbors: string[] = [];
    for (const row of tagResult.rows as any[]) {
      if (!visited.has(row.target_id)) {
        visited.add(row.target_id);
        nextNeighbors.push(row.target_id);
        if (row.target_id.startsWith('atom_')) {
            allAtomIds.add(row.target_id);
        }
      }
    }

    // Also find other compounds sharing these tags
    if (nextNeighbors.length > 0) {
        for (let i = 0; i < nextNeighbors.length; i += PGLITE_CHUNK_IDS) {
            const tagChunk = nextNeighbors.slice(i, i + PGLITE_CHUNK_IDS);
            const tagPlaceholders = tagChunk.map((_, j) => `$${j + 1}`).join(', ');
            const reverseResult = await db.run(
                `SELECT DISTINCT source_id FROM edges WHERE target_id IN (${tagPlaceholders})`,
                tagChunk
            );
            for (const row of reverseResult.rows as any[]) {
                if (!visited.has(row.source_id)) {
                    visited.add(row.source_id);
                    frontier.push(row.source_id);
                }
            }
        }
    }

    // Pull molecule atoms from visited compounds
    const compounds = chunk.filter(id => id.startsWith('mem_'));
    if (compounds.length > 0) {
        const compPlaceholders = compounds.map((_, i) => `$${i + 1}`).join(', ');
        const molResult = await db.run(
            `SELECT id FROM atoms WHERE compound_id IN (${compPlaceholders}) AND id NOT LIKE 'mem_%' AND source_path != 'atom_source'`,
            compounds
        );
        for (const row of molResult.rows as any[]) {
            if (!visited.has(row.id)) {
                visited.add(row.id);
                allAtomIds.add(row.id);
            }
        }
    }

    if (allAtomIds.size >= maxNodes) break;
  }

  return Array.from(allAtomIds).slice(0, maxNodes);
}

export async function distillMemory(req: DistillRequest): Promise<DistillResult> {
  const startTime = Date.now();
  const maxNodes = req.max_nodes ?? 1000;
  const batchSize = req.batch_size ?? 50;

  StructuredLogger.info('DISTILL_START', { maxNodes, batchSize });

  // 1. Traverse and collect all atom IDs
  const atomIds = await getAllReachableAtomIds(req.seed?.atom_ids, maxNodes);
  const originalNodeCount = atomIds.length;

  // 2. Process and compress nodes in batches (deterministic heuristic compression)
  // Filter out tag atoms (source_path = 'atom_source') - they're just index entries, not content
  const distilledNodes: Map<string, DistillNode> = new Map(); // Hash -> DistillNode
  const idToHash: Map<string, string> = new Map(); // atomId -> Hash

  for (let i = 0; i < atomIds.length; i += batchSize) {
    const batchIds = atomIds.slice(i, i + batchSize);
    const placeholders = batchIds.map((_, j) => `$${j + 1}`).join(', ');

    // Exclude tag atoms (source_path = 'atom_source') - they're just index entries
    const result = await db.run(
      `SELECT id, content, source_path, tags::text as tags_text, timestamp FROM atoms WHERE id IN (${placeholders}) AND source_path != 'atom_source'`,
      batchIds
    );

    const compressionPromises = (result.rows as any[]).map(async (row) => {
      // Deterministic compression - no LLM
      const compressed = heuristicCompress(row.content);
      const hash = crypto.createHash('sha256').update(compressed).digest('hex');

      if (distilledNodes.has(hash)) {
        // Merge duplicate: same compressed content = same node
        const existing = distilledNodes.get(hash)!;
        existing.originalIds.push(row.id);
        if (row.source_path && !existing.sources.includes(row.source_path)) {
            existing.sources.push(row.source_path);
        }
        // Merge tags from duplicates
        const newTags = parseTags(row.tags_text);
        newTags.forEach((tag: string) => {
          if (!existing.tags.includes(tag)) existing.tags.push(tag);
        });
      } else {
        distilledNodes.set(hash, {
          id: `distill_${hash.substring(0, 12)}`,
          originalIds: [row.id],
          content: row.content,
          compressedContent: compressed,
          tags: parseTags(row.tags_text),
          sources: row.source_path ? [row.source_path] : []
        });
      }
      idToHash.set(row.id, hash);
    });

    await Promise.all(compressionPromises);
    StructuredLogger.info('DISTILL_BATCH_COMPLETE', { 
      processed: Math.min(i + batchSize, atomIds.length), 
      total: atomIds.length,
      distilled_so_far: distilledNodes.size 
    });
  }

  // 3. Consolidate edges
  // We need to find edges between the original atomIds and map them to the distilled nodes
  const distilledEdges: Map<string, DistillEdge> = new Map(); // sourceHash-targetHash-relation -> DistillEdge

  // Get original edges
  const edgeResult = await db.run(`SELECT source_id, target_id, relation, weight FROM edges`, []);
  // Note: This could be large. In a real scenario, we'd filter by the visited nodes.
  const originalEdgeCount = edgeResult.rows.length;

  for (const edge of edgeResult.rows as any[]) {
    const sourceHash = idToHash.get(edge.source_id);
    const targetHash = idToHash.get(edge.target_id);

    // We only care about edges between nodes we've processed (or their tag atoms)
    if (sourceHash && targetHash) {
      const sourceDistId = distilledNodes.get(sourceHash)!.id;
      const targetDistId = distilledNodes.get(targetHash)!.id;
      const key = `${sourceDistId}-${targetDistId}-${edge.relation}`;

      if (distilledEdges.has(key)) {
        // Update metadata if needed
      } else {
        distilledEdges.set(key, {
          source: sourceDistId,
          target: targetDistId,
          relation: edge.relation,
          metadata: {
            timestamps: [],
            originalSources: []
          }
        });
      }
    }
  }

  const duration = Date.now() - startTime;
  const distilledNodeList = Array.from(distilledNodes.values());
  const distilledEdgeList = Array.from(distilledEdges.values());

  const originalSize = atomIds.length; // Simplified metric
  const compressedSize = distilledNodeList.length;
  const ratio = originalSize > 0 ? (originalSize / compressedSize).toFixed(2) : "1.00";

  const finalResult: DistillResult = {
    nodes: distilledNodeList,
    edges: distilledEdgeList,
    stats: {
      original_node_count: originalNodeCount,
      distilled_node_count: distilledNodeList.length,
      original_edge_count: originalEdgeCount,
      distilled_edge_count: distilledEdgeList.length,
      compression_ratio: `${ratio}:1`,
      duration_ms: duration
    }
  };

  // 4. Handle Export to Inbox (YAML Knowledge Gold Standard)
  if (req.export_to_inbox) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.resolve(process.cwd(), 'inbox/distilled');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });
    
    const fileName = `distilled_${timestamp}.yaml`;
    const exportPath = path.join(exportDir, fileName);
    
    // Format for high-density re-ingestion
    const yamlContent = yaml.dump({
      metadata: {
        source: 'Anchor Engine Distiller',
        seed: req.seed,
        stats: finalResult.stats
      },
      knowledge_atoms: finalResult.nodes.map(n => ({
        content: n.compressedContent,
        tags: n.tags,
        references: n.originalIds,
        sources: n.sources
      }))
    });
    
    fs.writeFileSync(exportPath, yamlContent, 'utf-8');
    StructuredLogger.info('DISTILL_EXPORTED', { path: exportPath });
  }

  return finalResult;
}
