import { Application, Request, Response } from 'express';
import { z } from 'zod';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { AtomizerService } from '../../services/ingest/atomizer-service.js';
import { AtomicIngestService } from '../../services/ingest/ingest-atomic.js';
import { StreamingIngestService } from '../../services/ingest/streaming-ingest.js';
import { ingestSchema } from '../../schemas/api-schemas.js';
import { PerformanceMonitor } from '../../services/monitoring/performance-monitor.js';

export function setupIngestRoutes(app: Application) {
  // Ingestion endpoint (Atomic Architecture)
  app.post('/v1/ingest', async (req: Request, res: Response) => {
    const startTime = Date.now();

    // Validate request body with Zod
    const validation = ingestSchema.safeParse(req.body);
    if (!validation.success) {
      StructuredLogger.warn('INGEST_VALIDATION_ERROR', { errors: validation.error.issues });
      return res.status(400).json({
        error: 'Invalid ingest request',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    try {
      const { content, source, type, bucket, buckets = [], tags = [] } = validation.data;

      if (!content) {
        StructuredLogger.warn('INGEST_INVALID_REQUEST', { error: 'Content is required' });
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      StructuredLogger.info('INGEST_REQUEST', {
        source: source || 'api_upload',
        content_length: content.length,
        buckets: buckets.length > 0 ? buckets : [bucket || 'notebook']
      });

      // Use legacy Atomizer pipeline for performance
      const atomizer = new AtomizerService();
      const atomicIngest = new AtomicIngestService();

      const provenance = (source && (source.includes('external') || source.includes('web'))) ? 'external' : 'internal';

      const atomizeResult = await atomizer.atomize(
        content,
        source || 'api_upload',
        provenance
      );

      // Skip ingestion if transient data was detected
      if (!atomizeResult) {
        const result = {
          status: 'skipped',
          message: 'Content skipped (transient data detected)',
          id: null,
          duration_ms: Date.now() - startTime
        };
        return res.json(result);
      }

      const { compound, molecules, atoms } = atomizeResult;

      // Ingest result
      const targetBuckets = buckets.length > 0 ? buckets : [bucket || 'notebook'];
      await atomicIngest.ingestResult(compound, molecules, atoms, targetBuckets);

      const duration = Date.now() - startTime;

      StructuredLogger.ingestion('success', {
        source: source || 'api_upload',
        compound_id: compound.id,
        atoms_count: atoms.length,
        molecules_count: molecules.length,
        buckets: targetBuckets,
        duration_ms: duration
      });

      const result = {
        status: 'success',
        message: `Ingested ${atoms.length} atoms and ${molecules.length} molecules`,
        id: compound.id,
        duration_ms: duration
      };

      res.status(200).json(result);
    } catch (e: any) {
      const duration = Date.now() - startTime;
      StructuredLogger.error('INGEST_ERROR', e, {
        duration_ms: duration
      });
      res.status(500).json({ error: e.message });
    }
  });

  // Streaming Ingestion endpoint for large files
  app.post('/v1/ingest/streaming', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    // Validate request body with Zod
    const validation = ingestSchema.safeParse(req.body);
    if (!validation.success) {
      StructuredLogger.warn('INGEST_VALIDATION_ERROR', { errors: validation.error.issues });
      return res.status(400).json({
        error: 'Invalid streaming ingest request',
        details: validation.error.issues.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }

    try {
      const { content, source, type, bucket, buckets = [], tags = [] } = validation.data;

      if (!content) {
        StructuredLogger.warn('INGEST_INVALID_REQUEST', { error: 'Content is required' });
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      // Check if content is large enough to warrant streaming
      const CONTENT_SIZE_THRESHOLD = 1024 * 1024; // 1MB threshold
      if (content.length < CONTENT_SIZE_THRESHOLD) {
        // For smaller content, use regular ingestion
        StructuredLogger.info('INGEST_FALLBACK', {
          message: 'Content size below threshold, using regular ingestion',
          content_length: content.length,
          threshold: CONTENT_SIZE_THRESHOLD
        });
        
        // Use the existing regular ingestion logic
        const atomizer = new AtomizerService();
        const atomicIngest = new AtomicIngestService();

        const provenance = (source && (source.includes('external') || source.includes('web'))) ? 'external' : 'internal';

        const atomizeResult = await atomizer.atomize(
          content,
          source || 'api_upload',
          provenance
        );

        // Skip ingestion if transient data was detected
        if (!atomizeResult) {
          const result = {
            status: 'skipped',
            message: 'Content skipped (transient data detected)',
            id: null,
            duration_ms: Date.now() - startTime
          };
          return res.json(result);
        }

        const { compound, molecules, atoms } = atomizeResult;

        // Ingest result
        const targetBuckets = buckets.length > 0 ? buckets : [bucket || 'notebook'];
        await atomicIngest.ingestResult(compound, molecules, atoms, targetBuckets);

        const duration = Date.now() - startTime;

        StructuredLogger.ingestion('success', {
          source: source || 'api_upload',
          compound_id: compound.id,
          atoms_count: atoms.length,
          molecules_count: molecules.length,
          buckets: targetBuckets,
          duration_ms: duration
        });

        const result = {
          status: 'success',
          message: `Ingested ${atoms.length} atoms and ${molecules.length} molecules`,
          id: compound.id,
          duration_ms: duration
        };

        res.status(200).json(result);
        return;
      }

      StructuredLogger.info('STREAMING_INGEST_REQUEST', {
        source: source || 'api_upload',
        content_length: content.length,
        buckets: buckets.length > 0 ? buckets : [bucket || 'notebook']
      });

      // Use streaming ingestion for large content
      const streamingIngest = new StreamingIngestService();
      
      // Set up progress tracking
      let lastProgressUpdate = Date.now();
      const progressUpdates: any[] = [];
      
      const result = await streamingIngest.ingestLargeFile(content, {
        source: source || 'api_upload',
        bucket: bucket || 'notebook',
        onProgress: (progress) => {
          // Throttle progress updates to avoid flooding the logs
          const now = Date.now();
          if (now - lastProgressUpdate > 5000) { // Update every 5 seconds
            StructuredLogger.info('STREAMING_INGEST_PROGRESS', progress);
            lastProgressUpdate = now;
          }
          progressUpdates.push(progress);
        }
      });

      const duration = Date.now() - startTime;

      if (result.success) {
        StructuredLogger.ingestion('streaming_success', {
          source: source || 'api_upload',
          compound_id: result.compoundId,
          message: result.message,
          duration_ms: duration
        });

        res.status(200).json({
          status: 'success',
          message: result.message,
          id: result.compoundId,
          duration_ms: duration,
          progress_updates: progressUpdates // Include progress updates in response
        });
      } else {
        StructuredLogger.error('STREAMING_INGEST_ERROR', {
          error: result.message,
          duration_ms: duration
        });
        
        res.status(500).json({
          status: 'error',
          message: result.message,
          duration_ms: duration
        });
      }
    } catch (e: any) {
      const duration = Date.now() - startTime;
      StructuredLogger.error('STREAMING_INGEST_ERROR', e, {
        duration_ms: duration
      });
      res.status(500).json({ error: e.message });
    }
  });
}
