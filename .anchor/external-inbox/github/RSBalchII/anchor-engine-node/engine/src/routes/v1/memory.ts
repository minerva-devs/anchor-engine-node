/**
 * Memory routes — explore / illuminate / distill endpoints
 *
 * POST /v1/memory/explore
 *   BFS graph traversal from seed concepts.
 *   Returns the connected subgraph as structural corpus compression.
 *
 * POST /v1/memory/distill
 *   Standard 133: Radial Distillation
 *   Line-level deduplication with radial inflation (4.8.2 implementation).
 *   Supports streaming mode via ?stream=true query param.
 */

import type { Application, Request, Response } from 'express';
import { StructuredLogger } from '../../utils/structured-logger.js';
import type { ExploreRequest } from '../../services/search/explore.js';
import { exploreMemory } from '../../services/search/explore.js';
import type { RadialDistillRequest } from '../../services/distillation/radial-distiller.js';
import { radialDistill } from '../../services/distillation/radial-distiller.js';
import { executeStreamingDistill, formatDistillSSE } from '../../services/distillation/streaming-distiller.js';
import { validate, schemas } from '../../middleware/validate.js';
import { db } from '../../core/db.js';

export function setupMemoryRoutes(app: Application) {
  // Note: memoryExplore schema validates basic structure; complex seed validation remains inline
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
        duration_ms: duration,
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
            score: 1,
          })),
          duration_ms: duration,
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

    StructuredLogger.info('DISTILL_REQUEST', {
      endpoint: '/v1/memory/distill',
      mode: 'radial',
    });

    try {
      // Check for streaming mode (default: false for backward compatibility)
      const streamMode = req.query.stream === 'true';
      const body = req.body as RadialDistillRequest;

      if (streamMode) {
        // Streaming mode: Server-Sent Events
        StructuredLogger.info('DISTILL_STREAMING_START', {
          radius: body.radius,
          output_format: body.output_format,
        });

        const stream = executeStreamingDistill({
          ...body,
          batchSize: 100,
        });

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Stream events to client
        for await (const event of stream) {
          res.write(formatDistillSSE(event));
        }

        res.end();

        StructuredLogger.info('DISTILL_STREAMING_COMPLETE', {
          duration_ms: Date.now() - startTime,
        });
        return;
      }

      // Standard mode: Single JSON response (4.8.2 implementation)
      const result = await radialDistill(body);
      const duration = Date.now() - startTime;

      StructuredLogger.info('RADIAL_DISTILL_COMPLETE', {
        compounds_processed: result.stats.compounds_processed,
        lines_total: result.stats.lines_total,
        lines_unique: result.stats.lines_unique,
        lines_duplicate: result.stats.lines_duplicate,
        compression_ratio: result.stats.compression_ratio,
        duration_ms: duration,
      });

      res.json({
        ...result,
        duration_ms: duration,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      StructuredLogger.error('DISTILL_ERROR', err instanceof Error ? err : new Error(msg), { error: msg });
      
      if (!res.headersSent) {
        res.status(500).json({ error: msg });
      } else {
        // For streaming mode, send error as SSE event
        res.write(formatDistillSSE({
          type: 'error',
          message: msg,
          details: err instanceof Error ? err.stack : undefined,
        }));
        res.end();
      }
    }
  });
}
