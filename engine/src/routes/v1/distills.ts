/**
 * Distill Routes - Version Control for Distills (Standard 016)
 *
 * API endpoints for managing and querying distill checkpoints.
 * Uses pointer-based file reading (start_byte, end_byte) for efficient streaming.
 */

import type { Application, Request, Response } from 'express';
import { StructuredLogger } from '../../utils/structured-logger.js';
import { getAllDistills, getDistill, getDistillsBySession, deleteDistill } from '../../services/distillation/distill-manager.js';
import fs from 'fs';

export function setupDistillRoutes(app: Application) {
  // GET /v1/distills/list - List all distills (newest first)
  app.get('/v1/distills/list', async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const distills = await getAllDistills(limit);

      StructuredLogger.info('DISTILLS_LIST', { count: distills.length });

      res.json({
        status: 'success',
        distills,
        count: distills.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      StructuredLogger.error('DISTILLS_LIST_ERROR', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /v1/distills/:id - Get a specific distill by ID
  app.get('/v1/distills/:id', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const distill = await getDistill(id);

      if (!distill) {
        res.status(404).json({ error: 'Distill not found' });
        return;
      }

      StructuredLogger.info('DISTILL_GET', { id: id });

      res.json({
        status: 'success',
        distill,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      StructuredLogger.error('DISTILL_GET_ERROR', error, { id: id });
      res.status(500).json({ error: error.message });
    }
  });

  // GET /v1/distills/:id/stream - Stream distill file content using pointer-based byte offsets (Standard: Pointer-Based File Reading for Distills v5.3.0)
  app.get('/v1/distills/:id/stream', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const distill = await getDistill(id);

      if (!distill) {
        res.status(404).json({ error: 'Distill not found' });
        return;
      }

      StructuredLogger.info('DISTILL_STREAM_INIT', { 
        id: id, 
        filename: distill.filename,
        start_byte: distill.start_byte,
        end_byte: distill.end_byte,
        file_size: distill.file_size
      });

      // Validate file exists
      if (!fs.existsSync(distill.file_path)) {
        StructuredLogger.error('DISTILL_FILE_NOT_FOUND', 'Distill file not found', { id, path: distill.file_path });
        res.status(404).json({ error: 'Distill file not found' });
        return;
      }

      // Use fs.createReadStream with byte offset parameters for pointer-based reading
      const stream = fs.createReadStream(distill.file_path, {
        start: distill.start_byte,
        end: distill.end_byte !== 0 ? distill.end_byte - 1 : undefined, // -1 for inclusive end
        autoClose: true,
      });

      // Set appropriate headers for streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      if (distill.file_size > 0) {
        res.setHeader('Content-Length', distill.file_size);
      }
      res.setHeader('Cache-Control', 'private, max-age=60'); // Short cache for distills

      // Stream content directly to response
      stream.pipe(res);

      stream.on('error', (error: Error) => {
        StructuredLogger.error('DISTILL_STREAM_ERROR', error, { id, stack: error.stack });
        res.status(500).json({ error: 'Failed to stream distill file content' });
      });

    } catch (error: any) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      const errObj = error instanceof Error ? error : new Error(msg);
      StructuredLogger.error('DISTILL_STREAM_FAILED', msg, { id, stack: errObj.stack });
      res.status(500).json({ error: msg });
    }
  });

  // GET /v1/distills/session/:sessionId - Get distills for a session
  app.get('/v1/distills/session/:sessionId', async (req: Request, res: Response) => {
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
    try {
      const distills = await getDistillsBySession(sessionId);

      StructuredLogger.info('DISTILLS_BY_SESSION', {
        sessionId: sessionId,
        count: distills.length,
      });

      res.json({
        status: 'success',
        sessionId: sessionId,
        distills,
        count: distills.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      StructuredLogger.error('DISTILLS_BY_SESSION_ERROR', error, { sessionId: sessionId });
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /v1/distills/:id - Delete a distill (file must be deleted separately)
  app.delete('/v1/distills/:id', async (req: Request, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const deleted = await deleteDistill(id);

      if (!deleted) {
        res.status(404).json({ error: 'Distill not found' });
        return;
      }

      StructuredLogger.info('DISTILL_DELETED', { id: id });

      res.json({
        status: 'success',
        message: 'Distill deleted from database',
        id: id,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      StructuredLogger.error('DISTILL_DELETE_ERROR', error, { id: id });
      res.status(500).json({ error: error.message });
    }
  });
}
