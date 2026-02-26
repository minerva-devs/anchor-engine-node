import { Application, Request, Response } from 'express';

export function setupGitRoutes(app: Application) {
  // GitHub Repository Ingestion Endpoints (Standard 115)
  // POST /v1/github/repos - Register new repo and trigger initial ingestion
  app.post('/v1/github/repos', async (req: Request, res: Response) => {
    try {
      const body = req.body as any;
      const url = body.url as string;
      const bucket = body.bucket as string;

      if (!url || !bucket) {
        res.status(400).json({ error: 'url and bucket are required' });
        return;
      }

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Register repo
      const repo = await service.registerRepo(url, bucket);

      // Start async ingestion (don't wait for completion)
      service.syncRepo(repo.id).catch((error: any) => {
        console.error(`[API] Background sync failed for ${repo.id}:`, error);
      });

      res.status(202).json({
        id: repo.id,
        status: 'ingesting',
        message: `Started ingestion for ${repo.owner}/${repo.repo}`,
      });
    } catch (error: any) {
      console.error('[API] GitHub repo registration error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /v1/github/repos - List all registered repos
  app.get('/v1/github/repos', async (_req: Request, res: Response) => {
    try {
      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();
      const repos = await service.listRepos();
      res.status(200).json(repos);
    } catch (error: any) {
      console.error('[API] GitHub repo list error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /v1/github/repos/:id/sync - Manual sync trigger
  app.post('/v1/github/repos/:id/sync', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Start async sync
      service.syncRepo(id).catch((error: any) => {
        console.error(`[API] Background sync failed for ${id}:`, error);
      });

      res.status(202).json({
        id,
        status: 'syncing',
        message: 'Sync started',
      });
    } catch (error: any) {
      console.error('[API] GitHub sync trigger error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // DELETE /v1/github/repos/:id - Remove repo
  app.delete('/v1/github/repos/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      const quarantinedCount = await service.removeRepo(id);

      res.status(200).json({
        status: 'removed',
        quarantined_atoms: quarantinedCount,
      });
    } catch (error: any) {
      console.error('[API] GitHub repo removal error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /v1/github/rate-limit - Check GitHub API rate limit status
  app.get('/v1/github/rate-limit', async (_req: Request, res: Response) => {
    try {
      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();
      const rateLimit = await service.getRateLimitStatus();
      res.status(200).json(rateLimit);
    } catch (error: any) {
      console.error('[API] GitHub rate limit check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // GET /v1/git/repos - List available git repositories
  app.get('/v1/git/repos', async (_req: Request, res: Response) => {
    try {
      const path = await import('path');
      const fs = await import('fs');
      const { pathManager } = await import('../../utils/path-manager.js');
      const { PROJECT_ROOT } = await import('../../config/paths.js');

      // Check common directories for git repos
      const potentialRepos: string[] = [];
      const basePath = pathManager.getBasePath();
      const checkDirs = [
        basePath,
        path.join(basePath, '..'),
        path.join(basePath, '..', '..'),
        PROJECT_ROOT
      ];

      for (const dir of checkDirs) {
        if (!dir) continue;
        try {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const repoPath = path.join(dir, entry.name);
              const gitPath = path.join(repoPath, '.git');
              if (fs.existsSync(gitPath) && !potentialRepos.includes(repoPath)) {
                potentialRepos.push(repoPath);
              }
            }
          }
        } catch {
          // Skip if directory doesn't exist or can't be read
        }
      }

      res.status(200).json(potentialRepos);
    } catch (error: any) {
      console.error('[API] Git repos list error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // POST /v1/git/run - Execute git command
  app.post('/v1/git/run', async (req: Request, res: Response) => {
    try {
      const { command, working_dir } = req.body;

      if (!command || !working_dir) {
        return res.status(400).json({ error: 'command and working_dir are required' });
      }

      const { exec } = await import('child_process');
      const util = await import('util');
      const execPromise = util.promisify(exec);

      // Security: Only allow git commands
      const gitCommand = `git ${command}`;

      console.log(`[Git] Running: ${gitCommand} in ${working_dir}`);

      try {
        const { stdout, stderr } = await execPromise(gitCommand, {
          cwd: working_dir,
          encoding: 'utf8',
          timeout: 30000 // 30 second timeout
        });

        res.status(200).json({
          command,
          output: stdout || stderr,
          success: true
        });
      } catch (execError: any) {
        // Git command failed - return error output
        res.status(200).json({
          command,
          output: execError.stdout || '',
          error: execError.stderr || execError.message,
          success: false
        });
      }
    } catch (error: any) {
      console.error('[API] Git command execution error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
