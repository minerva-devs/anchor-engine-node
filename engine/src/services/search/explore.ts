/**
 * Explore Service — Illuminate / BFS Graph Traversal
 *
 * Given seed concepts or atom IDs, performs a breadth-first traversal of the
 * STAR co-occurrence graph and returns the reachable subgraph. This is
 * "structural corpus compression": the returned molecule set is the distilled
 * meaning of the seed topic, extracted from the full knowledge graph.
 *
 * Two traversal strategies:
 *   1. Edge-based  — follows the `edges` table (source_id / target_id / weight)
 *   2. Tag-based   — follows shared tags in the `tags` table (fallback if no edges)
 */

import { db } from '../../core/db.js';
import { StructuredLogger } from '../../utils/structured-logger.js';

export interface ExploreRequest {
  seed: {
    query?: string;
    atom_ids?: string[];
    limit_seeds?: number;
    /** Global mode: use top-degree nodes as seeds, no query required */
    global?: boolean;
    /** How many top-degree nodes to use as seeds (global mode only, default 10) */
    seed_count?: number;
  };
  max_depth?: number;
  min_weight?: number;
  max_nodes?: number;
  format?: 'flat' | 'graph';
}

export interface ExploreNode {
  id: string;
  content: string;
  source: string;
  tags: string[];
}

export interface ExploreEdge {
  source: string;
  target: string;
  weight: number;
}

export interface ExploreResult {
  nodes: ExploreNode[];
  edges?: ExploreEdge[];
  stats: {
    nodes_count: number;
    edges_count?: number;
    seed_nodes: number;
    max_depth_achieved: number;
    strategy: string;
  };
}

/** Resolve seed atom IDs from query text via FTS */
async function resolveSeedsByQuery(query: string, limit: number): Promise<string[]> {
  const terms = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(t => `${t}:*`)
    .join(' & ');

  if (!terms) return [];

  try {
    const result = await db.run(
      `SELECT id FROM atoms
       WHERE to_tsvector('simple', content) @@ to_tsquery('simple', $1)
       LIMIT $2`,
      [terms, limit]
    );
    return (result.rows as any[]).map(r => r.id);
  } catch {
    // Fallback: LIKE search
    const like = `%${query.split(' ')[0]}%`;
    const result = await db.run(
      `SELECT id FROM atoms WHERE content ILIKE $1 LIMIT $2`,
      [like, limit]
    );
    return (result.rows as any[]).map(r => r.id);
  }
}

/** BFS via edges table */
async function bfsViaEdges(
  seeds: string[],
  maxDepth: number,
  minWeight: number,
  maxNodes: number
): Promise<{ nodeIds: string[]; edges: ExploreEdge[] }> {
  const visited = new Set<string>(seeds);
  let frontier = [...seeds];
  let depthReached = 0;
  const allEdges: ExploreEdge[] = [];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const placeholders = frontier.map((_, i) => `$${i + 2}`).join(', ');
    const result = await db.run(
      `SELECT source_id, target_id, weight FROM edges
       WHERE (source_id IN (${placeholders}) OR target_id IN (${placeholders}))
         AND weight >= $1`,
      [minWeight, ...frontier]
    );

    const nextFrontier: string[] = [];
    for (const row of result.rows as any[]) {
      const neighbor = visited.has(row.source_id) ? row.target_id : row.source_id;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        nextFrontier.push(neighbor);
      }
      // Record edge (dedup by pair)
      allEdges.push({ source: row.source_id, target: row.target_id, weight: row.weight });
    }

    frontier = nextFrontier;
    depthReached = depth + 1;
    if (visited.size >= maxNodes) break;
  }

  return {
    nodeIds: [...visited].slice(0, maxNodes),
    edges: allEdges
  };
}

/** BFS via shared tags (fallback when edges table is sparse/empty) */
async function bfsViaTags(
  seeds: string[],
  maxDepth: number,
  maxNodes: number
): Promise<{ nodeIds: string[] }> {
  const visited = new Set<string>(seeds);
  let frontier = [...seeds];

  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth++) {
    const placeholders = frontier.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.run(
      `SELECT DISTINCT t2.atom_id
       FROM tags t1
       JOIN tags t2 ON t1.tag = t2.tag AND t1.atom_id != t2.atom_id
       WHERE t1.atom_id IN (${placeholders})`,
      frontier
    );

    const nextFrontier: string[] = [];
    for (const row of result.rows as any[]) {
      if (!visited.has(row.atom_id)) {
        visited.add(row.atom_id);
        nextFrontier.push(row.atom_id);
      }
    }
    frontier = nextFrontier;
    if (visited.size >= maxNodes) break;
  }

  return { nodeIds: [...visited].slice(0, maxNodes) };
}

/** Fetch full atom details for a list of IDs */
async function fetchNodes(ids: string[]): Promise<ExploreNode[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const atomsResult = await db.run(
    `SELECT id, content, source_path FROM atoms WHERE id IN (${placeholders})`,
    ids
  );

  const tagsResult = await db.run(
    `SELECT atom_id, tag FROM tags WHERE atom_id IN (${placeholders})`,
    ids
  );

  const tagMap = new Map<string, string[]>();
  for (const row of tagsResult.rows as any[]) {
    if (!tagMap.has(row.atom_id)) tagMap.set(row.atom_id, []);
    tagMap.get(row.atom_id)!.push(row.tag);
  }

  return (atomsResult.rows as any[]).map(r => ({
    id: r.id,
    content: r.content,
    source: r.source_path || '',
    tags: tagMap.get(r.id) || []
  }));
}

/** Check if the edges table has any rows */
async function edgesTableHasData(): Promise<boolean> {
  try {
    const result = await db.run(`SELECT 1 FROM edges LIMIT 1`, []);
    return (result.rows as any[]).length > 0;
  } catch {
    return false;
  }
}

/**
 * Global mode: return the top N atom IDs by weighted degree centrality.
 * These are the most interconnected nodes in the entire corpus — the spine.
 */
async function globalTopNodes(seedCount: number, minWeight: number): Promise<string[]> {
  const result = await db.run(
    `SELECT id, SUM(weight) AS total_weight
     FROM (
       SELECT source_id AS id, weight FROM edges WHERE weight >= $1
       UNION ALL
       SELECT target_id AS id, weight FROM edges WHERE weight >= $1
     ) all_edges
     GROUP BY id
     ORDER BY total_weight DESC
     LIMIT $2`,
    [minWeight, seedCount]
  );
  return (result.rows as any[]).map(r => r.id);
}

export async function exploreMemory(req: ExploreRequest): Promise<ExploreResult> {
  const maxDepth = Math.min(req.max_depth ?? 2, 4);
  const minWeight = req.min_weight ?? 0.1;
  const maxNodes = Math.min(req.max_nodes ?? 50, 200);
  const limitSeeds = req.seed.limit_seeds ?? 5;
  const seedCount = req.seed.seed_count ?? 10;
  const format = req.format ?? 'flat';

  // 1. Resolve seeds
  let seedIds: string[] = [];

  if (req.seed.global) {
    // Global mode: top-degree nodes, no query needed
    seedIds = await globalTopNodes(seedCount, minWeight);
  } else {
    if (req.seed.atom_ids?.length) {
      seedIds = req.seed.atom_ids;
    }
    if (req.seed.query && seedIds.length < limitSeeds) {
      const fromQuery = await resolveSeedsByQuery(req.seed.query, limitSeeds - seedIds.length);
      seedIds = [...new Set([...seedIds, ...fromQuery])];
    }
  }

  if (seedIds.length === 0) {
    StructuredLogger.warn('EXPLORE_NO_SEEDS', { query: req.seed.query, global: req.seed.global });
    return {
      nodes: [],
      stats: { nodes_count: 0, seed_nodes: 0, max_depth_achieved: 0, strategy: 'none' }
    };
  }

  const actualSeedCount = seedIds.length;
  StructuredLogger.info('EXPLORE_START', { seeds: actualSeedCount, max_depth: maxDepth, max_nodes: maxNodes });

  // 2. BFS traversal — prefer edges table, fall back to tag-based
  let nodeIds: string[];
  let edges: ExploreEdge[] = [];
  let strategy: string;

  const hasEdges = await edgesTableHasData();
  if (hasEdges) {
    const result = await bfsViaEdges(seedIds, maxDepth, minWeight, maxNodes);
    nodeIds = result.nodeIds;
    edges = result.edges;
    strategy = 'edge-bfs';
  } else {
    const result = await bfsViaTags(seedIds, maxDepth, maxNodes);
    nodeIds = result.nodeIds;
    strategy = 'tag-bfs';
  }

  // 3. Fetch node details
  const nodes = await fetchNodes(nodeIds);

  StructuredLogger.info('EXPLORE_DONE', { nodes: nodes.length, edges: edges.length, strategy });

  if (format === 'graph') {
    // Filter edges to only include pairs within our result set
    const nodeSet = new Set(nodeIds);
    const filteredEdges = edges.filter(e => nodeSet.has(e.source) && nodeSet.has(e.target));
    return {
      nodes,
      edges: filteredEdges,
      stats: {
        nodes_count: nodes.length,
        edges_count: filteredEdges.length,
        seed_nodes: actualSeedCount,
        max_depth_achieved: maxDepth,
        strategy
      }
    };
  }

  // Flat format
  return {
    nodes,
    stats: {
      nodes_count: nodes.length,
      seed_nodes: actualSeedCount,
      max_depth_achieved: maxDepth,
      strategy
    }
  };
}
