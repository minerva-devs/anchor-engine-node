import { Application, Request, Response } from 'express';
import { db } from '../../core/db.js';
import { getState, clearState } from '../../services/scribe/scribe.js';
import { PATHS, PROJECT_ROOT } from '../../config/paths.js';

export function setupSystemRoutes(app: Application) {
  // GET /health - Docker health check endpoint
  // Returns 200 if DB is connected and system is healthy
  app.get('/health', async (_req: Request, res: Response) => {
    try {
      // Check database connectivity
      const result = await db.run('SELECT 1 as healthy');
      const dbHealthy = result.rows?.[0]?.healthy === 1;

      // Check critical directories exist
      const fs = await import('fs');
      const criticalDirs = [
        PATHS.INBOX_DIR,
        PATHS.EXTERNAL_INBOX_DIR,
        PATHS.CONTEXT_DIR
      ];

      const dirsExist = await Promise.all(
        criticalDirs.map(async dir => {
          try {
            await fs.promises.access(dir, fs.constants.R_OK);
            return true;
          } catch {
            return false;
          }
        })
      );

      const allDirsOk = dirsExist.every(d => d);

      if (dbHealthy && allDirsOk) {
        res.status(200).json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: 'connected',
            directories: 'accessible'
          }
        });
      } else {
        res.status(503).json({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          checks: {
            database: dbHealthy ? 'connected' : 'disconnected',
            directories: allDirsOk ? 'accessible' : 'some missing'
          }
        });
      }
    } catch (error: any) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        checks: {
          database: 'error',
          directories: 'unknown'
        }
      });
    }
  });

  // GET /v1/stats - System statistics (anchor_stats tool)
  app.get('/v1/stats', async (_req: Request, res: Response) => {
    try {
      const startTime = Date.now();

      // Get counts in parallel
      const [atomsResult, sourcesResult, tagsResult, moleculesResult] = await Promise.all([
        db.run('SELECT COUNT(*) as count FROM atoms'),
        db.run('SELECT COUNT(*) as count FROM sources'),
        db.run('SELECT COUNT(DISTINCT tag) as count FROM tags WHERE tag IS NOT NULL'),
        db.run('SELECT COUNT(*) as count FROM molecules')
      ]);

      const stats = {
        atoms: parseInt(atomsResult.rows?.[0]?.count || '0'),
        sources: parseInt(sourcesResult.rows?.[0]?.count || '0'),
        tags: parseInt(tagsResult.rows?.[0]?.count || '0'),
        molecules: parseInt(moleculesResult.rows?.[0]?.count || '0'),
        query_time_ms: Date.now() - startTime
      };

      res.status(200).json(stats);
    } catch (error) {
      console.error('Stats retrieval error:', error);
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  });

  // Scribe State Endpoints
  app.get('/v1/scribe/state', async (_req: Request, res: Response) => {
    try {
      const state = await getState();
      res.status(200).json({ state });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete('/v1/scribe/state', async (_req: Request, res: Response) => {
    try {
      const result = await clearState();
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // System config endpoint
  app.get('/v1/system/config', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'success',
      config: {
        version: '1.0.0',
        engine: 'Sovereign Context Engine',
        timestamp: new Date().toISOString()
      }
    });
  });

  // Memory status endpoint
  app.get('/v1/system/memory', async (_req: Request, res: Response) => {
    try {
      const { resourceManager } = await import('../../utils/resource-manager.js');
      const { idleManager } = await import('../../services/idle-manager.js');
      const { NlpService } = await import('../../services/nlp/nlp-service.js');
      const { isModelLoadedStatus: isNerModelLoaded } = await import('../../services/tags/gliner.js');

      const memoryStats = resourceManager.getMemoryStats();
      const idleStatus = idleManager.getStatus();

      res.status(200).json({
        status: 'success',
        memory: {
          rss: Math.round(memoryStats.rss / 1024 / 1024),
          heapUsed: Math.round(memoryStats.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryStats.heapTotal / 1024 / 1024),
          percentageUsed: Math.round(memoryStats.percentageUsed * 100) / 100
        },
        idle: idleStatus,
        models: {
          nlpLoaded: NlpService.isModelLoadedStatus(),
          nerLoaded: isNerModelLoaded()
        },
        timestamp: new Date().toISOString()
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Watcher Path Endpoints
  // GET /v1/system/paths - List currently watched paths
  app.get('/v1/system/paths', async (_req: Request, res: Response) => {
    try {
      const { getWatchedPaths } = await import('../../services/ingest/watchdog.js');
      const paths = getWatchedPaths();
      res.status(200).json({ paths });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /v1/system/paths - Add a new path to watch
  app.post('/v1/system/paths', async (req: Request, res: Response) => {
    try {
      const { path: newPath } = req.body;
      if (!newPath) {
        res.status(400).json({ error: 'Path is required' });
        return;
      }

      // Security: Validate path is within allowed directories
      const pathModule = await import('path');
      const fs = await import('fs');

      // Resolve to absolute path
      const resolvedPath = pathModule.resolve(newPath);
      
      // Ensure path exists
      try {
        await fs.promises.access(resolvedPath, fs.constants.R_OK);
      } catch {
        res.status(400).json({ error: 'Path does not exist or is not readable' });
        return;
      }

      // Security: Ensure path is within PROJECT_ROOT or is an absolute path outside
      // We allow paths outside PROJECT_ROOT but they must be explicitly absolute
      if (!pathModule.isAbsolute(newPath)) {
        res.status(400).json({ 
          error: 'Path must be absolute for security reasons',
          hint: 'Use an absolute path starting with / or C:\\'
        });
        return;
      }

      // Normalize both paths for comparison
      const normalizedPath = resolvedPath.replace(/\\/g, '/');
      const normalizedProjectRoot = PROJECT_ROOT.replace(/\\/g, '/');

      // Allowlist: paths must be either within PROJECT_ROOT or explicitly absolute
      const isWithinProjectRoot = normalizedPath.startsWith(normalizedProjectRoot + '/') || 
                                   normalizedPath === normalizedProjectRoot;

      if (!isWithinProjectRoot) {
        // For paths outside project root, require explicit confirmation
        res.status(200).json({
          status: 'warning',
          message: 'Path is outside PROJECT_ROOT. Ensure this is intentional.',
          path: resolvedPath,
          security_note: 'External paths are allowed but should be trusted directories only'
        });
        // Still allow the path but log it
        console.warn('[Security] Adding external watch path:', resolvedPath);
      }

      const { addWatchPath } = await import('../../services/ingest/watchdog.js');
      const success = await addWatchPath(resolvedPath);

      res.status(200).json({
        status: success ? 'success' : 'failed',
        message: success ? `Now watching: ${resolvedPath}` : 'Failed to add path',
        path: resolvedPath,
        within_project_root: isWithinProjectRoot
      });
    } catch (e: any) {
      console.error('[API] Failed to add watch path:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // DELETE /v1/system/paths - Remove a watched path
  app.delete('/v1/system/paths', async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        res.status(400).json({ error: 'Path is required' });
        return;
      }

      const { removeWatchPath } = await import('../../services/ingest/watchdog.js');
      const success = await removeWatchPath(path);

      res.status(200).json({
        status: success ? 'success' : 'failed',
        message: success ? `Stopped watching: ${path}` : 'Failed to remove path',
        path
      });
    } catch (e: any) {
      console.error('[API] Failed to remove watch path:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST /v1/system/explorer - Open file explorer at specified path
  app.post('/v1/system/explorer', async (req: Request, res: Response) => {
    try {
      const { path } = req.body;
      if (!path) {
        res.status(400).json({ error: 'Path is required' });
        return;
      }

      const { execFile } = await import('child_process');
      const util = await import('util');
      const pathModule = await import('path');
      const { PROJECT_ROOT } = await import('../../config/paths.js');
      const execFilePromise = util.promisify(execFile);
      const platform = process.platform;

      // Security: Resolve requested directory to absolute path and verify it's within PROJECT_ROOT
      const absoluteRequestedDir = pathModule.resolve(path);
      const relativePath = pathModule.relative(PROJECT_ROOT, absoluteRequestedDir);

      // Check if it's an outside directory (e.g. starts with ..) or an absolute path (on Windows)
      const isOutside = relativePath.startsWith('..') || pathModule.isAbsolute(relativePath);

      if (isOutside && absoluteRequestedDir !== PROJECT_ROOT) {
        console.warn(`[System] Rejected unauthorized explorer access: ${path} (resolved: ${absoluteRequestedDir})`);
        return res.status(403).json({ error: 'Directory not authorized for explorer access' });
      }

      // Open file explorer based on platform safely using execFile
      if (platform === 'win32') {
        await execFilePromise('explorer.exe', [absoluteRequestedDir]);
      } else if (platform === 'darwin') {
        await execFilePromise('open', [absoluteRequestedDir]);
      } else {
        await execFilePromise('xdg-open', [absoluteRequestedDir]);
      }

      res.status(200).json({
        status: 'success',
        message: `Opened file explorer at: ${absoluteRequestedDir}`
      });
    } catch (e: any) {
      console.error('[API] Failed to open file explorer:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // Configuration endpoint to provide runtime configuration to clients
  app.get('/v1/config', async (_req: Request, res: Response) => {
    try {
      // Import config here to avoid circular dependencies
      const { config } = await import('../../config/index.js');

      const serverConfig = {
        port: config.PORT,
        host: config.HOST,
        server_url: `http://${config.HOST}:${config.PORT}`,
        llm_provider: config.LLM_PROVIDER,
        search_strategy: config.SEARCH.strategy,
        features: config.FEATURES
      };

      res.status(200).json(serverConfig);
    } catch (error: any) {
      console.error('Config endpoint error:', error);
      res.status(500).json({
        error: error.message,
        fallback_config: {
          port: 3160,
          host: '127.0.0.1',
          server_url: 'http://127.0.0.1:3160'
        }
      });
    }
  });

  // Watchdog control endpoints
  app.get('/v1/watchdog/status', async (_req: Request, res: Response) => {
    try {
      const { getWatcherStatus } = await import('../../services/ingest/watchdog.js');
      const status = getWatcherStatus();
      res.status(200).json({ status: 'success', ...status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/v1/watchdog/start', async (_req: Request, res: Response) => {
    try {
      const { startWatchdog } = await import('../../services/ingest/watchdog.js');
      await startWatchdog();
      res.status(200).json({ status: 'success', message: 'Watchdog started' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/v1/watchdog/stop', async (_req: Request, res: Response) => {
    try {
      const { stopWatchdog } = await import('../../services/ingest/watchdog.js');
      await stopWatchdog();
      res.status(200).json({ status: 'success', message: 'Watchdog stopped' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/v1/watchdog/ingest', async (_req: Request, res: Response) => {
    try {
      const { triggerManualIngest } = await import('../../services/ingest/watchdog.js');
      const result = await triggerManualIngest();
      res.status(200).json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // System status endpoint
  app.get('/v1/system/status', async (_req: Request, res: Response) => {
    try {
      const { systemStatus } = await import('../../services/system-status.js');
      const status = systemStatus.getStatus();
      res.json({
        status: 'success',
        ...status
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File read endpoint for distilled content
  app.get('/v1/files/read', async (req: Request, res: Response) => {
    try {
      const filePath = req.query.path as string;
      if (!filePath) {
        res.status(400).json({ error: 'Path parameter required' });
        return;
      }

      const fs = await import('fs');
      const path = await import('path');

      // Security: Canonicalize paths to prevent symlink traversal attacks
      // Get realpath of base directory (inbox/distilled)
      const baseDir = path.resolve(PATHS.INBOX_DIR, 'distilled');
      let realBaseDir: string;
      try {
        realBaseDir = await fs.promises.realpath(baseDir);
      } catch {
        res.status(500).json({ error: 'Base directory not accessible' });
        return;
      }

      // Resolve and canonicalize requested path
      const resolvedPath = path.resolve(filePath);
      let realFilePath: string;
      try {
        realFilePath = await fs.promises.realpath(resolvedPath);
      } catch {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      // Verify file is within allowed directory using path.relative
      const relativePath = path.relative(realBaseDir, realFilePath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        res.status(403).json({ error: 'Access denied: file outside allowed directory' });
        return;
      }

      // Additional checks: must end with .yaml and be a file
      if (!realFilePath.endsWith('.yaml')) {
        res.status(403).json({ error: 'Access denied: only .yaml files allowed' });
        return;
      }

      const stats = await fs.promises.stat(realFilePath);
      if (!stats.isFile()) {
        res.status(403).json({ error: 'Access denied: not a regular file' });
        return;
      }

      const content = await fs.promises.readFile(realFilePath, 'utf-8');
      res.json({
        status: 'success',
        path: filePath,
        content: content
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
}
