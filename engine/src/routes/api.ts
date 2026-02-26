/**
 * API Routes for Sovereign Context Engine
 *
 * Standardized API Interface implementing UniversalRAG architecture.
 * Refactored into modular routes in ./v1/
 */

import { Application, Request, Response } from 'express';
import { setupIngestRoutes } from './v1/ingest.js';
import { setupAtomRoutes } from './v1/atoms.js';
import { setupBackupRoutes } from './v1/backup.js';
import { setupSearchRoutes } from './v1/search.js';
import { setupTagsRoutes } from './v1/tags.js';
import { setupResearchRoutes } from './v1/research.js';
import { setupSystemRoutes } from './v1/system.js';
import { setupGitRoutes } from './v1/git.js';
import { setupAdminRoutes } from './v1/admin.js';
import { setupEnhancedRoutes } from './enhanced-api.js';

export function setupRoutes(app: Application) {
  // Register modular routes
  setupIngestRoutes(app);
  setupAtomRoutes(app);
  setupBackupRoutes(app);
  setupSearchRoutes(app);
  setupTagsRoutes(app);
  setupResearchRoutes(app);
  setupSystemRoutes(app);
  setupGitRoutes(app);
  setupAdminRoutes(app);

  // Include enhanced routes
  setupEnhancedRoutes(app);

  // Return 503 for disabled endpoints
  app.post('/v1/chat/completions', (_req, res) => {
    res.status(503).json({ error: 'Chat completions disabled', message: 'Inference server not configured' });
  });
  app.get('/v1/models', (_req, res) => {
    res.status(503).json({ error: 'Models endpoint disabled', message: 'Inference server not configured' });
  });
  app.get('/v1/model/status', (_req, res) => {
    res.status(503).json({ error: 'Model status disabled', message: 'Inference server not configured' });
  });
  app.post('/v1/model/load', (_req, res) => {
    res.status(503).json({ error: 'Model load disabled', message: 'Inference server not configured' });
  });
  app.post('/v1/model/unload', (_req, res) => {
    res.status(503).json({ error: 'Model unload disabled', message: 'Inference server not configured' });
  });

  // Trigger Dream Endpoint (Disabled - Optimized for STAR algorithm)
  app.post('/v1/dream', async (_req: Request, res: Response) => {
    res.status(501).json({
      error: 'Dreamer service is disabled',
      message: 'This endpoint has been disabled to optimize startup for the STAR algorithm'
    });
  });
}
