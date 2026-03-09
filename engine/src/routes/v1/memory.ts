/**
 * Memory routes — explore / illuminate endpoint
 *
 * POST /v1/memory/explore
 *   BFS graph traversal from seed concepts.
 *   Returns the connected subgraph as structural corpus compression.
 */

import { Application, Request, Response } from 'express';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { exploreMemory, ExploreRequest } from '../../services/search/explore.js';
import { distillMemory, DistillRequest } from '../../services/search/distill.js';
import { radialDistill, RadialDistillRequest } from '../../services/distillation/radial-distiller.js';

export function setupMemoryRoutes(app: Application) {
  app.post('/v1/memory/explore', async (req: Request, res: Response) => {
    const startTime = Date.now();
    StructuredLogger.info('EXPLORE_REQUEST', { endpoint: '/v1/memory/explore' });

    try {
      const body = req.body as ExploreRequest;

      if (!body?.seed || (!body.seed.global && !body.seed.query && !body.seed.atom_ids?.length)) {
        res.status(400).json({ error: 'seed.query, seed.atom_ids, or seed.global:true is required' });
        return;
      }

      const result = await exploreMemory(body);
      const duration = Date.now() - startTime;

      StructuredLogger.info('EXPLORE_COMPLETE', {
        nodes: result.stats.nodes_count,
        strategy: result.stats.strategy,
        duration_ms: duration
      });

      // Normalise to a consistent shape regardless of flat/graph format
      if (result.nodes !== undefined && !('results' in result)) {
        // graph or flat — return as-is but also expose `results` alias for MCP compatibility
        res.json({
          ...result,
          results: result.nodes.map(n => ({
            id: n.id,
            content: n.content,
            source: n.source,
            tags: n.tags,
            score: 1
          })),
          duration_ms: duration
        });
      } else {
        res.json({ ...result, duration_ms: duration });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      StructuredLogger.error('EXPLORE_ERROR', err instanceof Error ? err : new Error(msg), { error: msg });
      res.status(500).json({ error: msg });
    }
  });

  app.post('/v1/memory/distill', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const useRadial = req.body?.radial === true;

    StructuredLogger.info('DISTILL_REQUEST', {
      endpoint: '/v1/memory/distill',
      mode: useRadial ? 'radial' : 'legacy'
    });

    try {
      if (useRadial) {
        // Standard 133: Radial Distillation
        const body = req.body as RadialDistillRequest;
        const result = await radialDistill(body);
        const duration = Date.now() - startTime;

        StructuredLogger.info('RADIAL_DISTILL_COMPLETE', {
          compounds_processed: result.stats.compounds_processed,
          lines_total: result.stats.lines_total,
          lines_unique: result.stats.lines_unique,
          compression_ratio: result.stats.compression_ratio,
          duration_ms: duration
        });

        res.json({
          ...result,
          duration_ms: duration
        });
      } else {
        // Legacy atom-level distillation
        const body = req.body as DistillRequest;
        const result = await distillMemory(body);
        const duration = Date.now() - startTime;

        StructuredLogger.info('DISTILL_COMPLETE', {
          original_nodes: result.stats.original_node_count,
          distilled_nodes: result.stats.distilled_node_count,
          ratio: result.stats.compression_ratio,
          duration_ms: duration
        });

        res.json({
          ...result,
          duration_ms: duration
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      StructuredLogger.error('DISTILL_ERROR', err instanceof Error ? err : new Error(msg), { error: msg });
      res.status(500).json({ error: msg });
    }
  });
}
