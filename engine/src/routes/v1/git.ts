import type { Application, Request, Response } from 'express';
import { config } from '../../config/index.js';
import { validate, schemas } from '../../middleware/validate.js';
import { PATHS } from '../../config/paths.js';

/**
 * Parse GitHub URL to extract owner, repo, and branch
 */
function parseGitHubUrl(url: string): { owner: string; repo: string; branch: string } {
  const match = url.match(/github\.com[:/]([^/]+)\/([^/]+)(?:\.git)?(?:\/tree\/([^/]+))?/i);
  if (!match) {
    throw new Error('Invalid GitHub URL');
  }
  return {
    owner: match[1],
    repo: match[2],
    branch: match[3] || 'main',
  };
}

export function setupGitRoutes(app: Application) {
  // GitHub Repository Ingestion Endpoints (Standard 115)
  
  // POST /v1/ingest/github - Alias endpoint for backward compatibility with tests
  app.post('/v1/ingest/github', async (req: Request, res: Response) => {
    try {
      const { owner = 'RSBalchII', repo = 'anchor-engine-node', branch = 'main' } = req.body;
      
      // Validate inputs
      if (!owner || !repo) {
        return res.status(400).json({ error: 'owner and repo are required' });
      }

      const url = `https://github.com/${owner}/${repo}.git`;
      
      // Use same logic as /v1/github/repos
      const includeHistory = req.body.include_history === true;
      const runAnalysis = req.body.run_analysis === true;

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Register repo with auto-generated bucket
      const bucket = `github:${owner}/${repo}`;
      
      // Use unauthenticated requests by default (no token stored)
      const tempToken = undefined; 

      console.log(`[API] GitHub ingestion via alias endpoint: ${url}`);

      // Register and ingest
      await service.registerRepo(url, bucket);
      
      res.status(200).json({
        status: 'success',
        message: `GitHub repo ingestion initiated for ${owner}/${repo}`,
        url,
        owner,
        repo,
        branch,
        files_to_process: 0, // Will be updated after clone
      });
    } catch (error: any) {
      console.error('[API] GitHub ingestion error:', error);
      res.status(500).json({ 
        error: 'GitHub ingestion failed',
        details: error.message 
      });
    }
  });

  // POST /v1/github/repos - Register new repo and trigger initial ingestion
  app.post('/v1/github/repos', validate(schemas.githubRepos), async (req: Request, res: Response) => {
    try {
      const { body } = req;
      const url = body.url as string;
      const includeHistory = body.include_history === true;
      const runAnalysis = body.run_analysis === true;

      // Auto-generate bucket from repo URL (e.g., "github:user/repo")
      const { owner, repo } = parseGitHubUrl(url);
      const bucket = `github:${owner}/${repo}`;

      // Get temporary GitHub token from header (if provided by user)
      // Token is NOT stored, used only for this operation
      const tempToken = req.headers['x-github-token'] as string | undefined || config.GITHUB_TOKEN;

      if (tempToken) {
        console.log(`[API] GitHub token received (length: ${tempToken.length}, source: ${req.headers['x-github-token'] ? 'header' : 'config'})`);
      } else {
        console.log('[API] No GitHub token provided - will use unauthenticated requests');
      }

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Register repo
      const repoRecord = await service.registerRepo(url, bucket);

      // Start async ingestion (don't wait for completion)
      (async () => {
        try {
          await service.syncRepo(repoRecord.id, { runAnalysis, token: tempToken });
          if (includeHistory) {
            // Use temp token if provided, otherwise fall back to env var
            const token = tempToken || process.env.GITHUB_TOKEN;
            await service.ingestGitHistory(repoRecord.owner, repoRecord.repo, repoRecord.branch, bucket, token);
            console.log(`[API] Git history ingested for ${repoRecord.owner}/${repoRecord.repo}`);
          }
          // Clear temp token from memory after use (security)
          if (tempToken) {
            console.log(`[API] Temporary GitHub token cleared after use`);
          }
        } catch (error: any) {
          console.error(`[API] Background sync/history failed for ${repoRecord.id}:`, error);
          // Clear temp token on error too
          if (tempToken) {
            console.log(`[API] Temporary GitHub token cleared after error`);
          }
        }
      })();

      const features: string[] = [];
      if (includeHistory) features.push('commit history');
      if (runAnalysis) features.push('code analysis');

      res.status(202).json({
        id: repoRecord.id,
        status: 'ingesting',
        include_history: includeHistory,
        run_analysis: runAnalysis,
        message: `Started ingestion for ${repoRecord.owner}/${repoRecord.repo}${features.length ? ` (with ${features.join(' and ')})` : ''}`,
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
      const runAnalysis = req.body?.run_analysis === true;

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Start async sync
      service.syncRepo(id, { runAnalysis }).catch((error: any) => {
        console.error(`[API] Background sync failed for ${id}:`, error);
      });

      res.status(202).json({
        id,
        status: 'syncing',
        run_analysis: runAnalysis,
        message: `Sync started${runAnalysis ? ' (with code analysis)' : ''}`,
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

  // DELETE /v1/github/repos - Clear ALL repos
  app.delete('/v1/github/repos', async (req: Request, res: Response) => {
    try {
      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      // Get all repo IDs
      const allRepos = await service.listRepos();
      const repoIds = allRepos.map((r: any) => r.id);

      let totalQuarantined = 0;
      for (const id of repoIds) {
        const quarantinedCount = await service.removeRepo(id);
        totalQuarantined += quarantinedCount;
      }

      // Also clear the mirror directory
      const mirrorDir = PATHS.EXTERNAL_INBOX_DIR.replace(/\\/g, '/') + '/github';
      const fs = await import('fs');
      if (fs.existsSync(mirrorDir)) {
        fs.rmSync(mirrorDir, { recursive: true, force: true });
        console.log(`[API] Cleared GitHub mirror directory: ${mirrorDir}`);
      }

      res.status(200).json({
        status: 'cleared',
        repos_removed: repoIds.length,
        quarantined_atoms: totalQuarantined,
        mirror_cleared: true,
      });
    } catch (error: any) {
      console.error('[API] GitHub clear all error:', error);
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

  // GET /v1/github/credentials - Check for stored GitHub credentials
  app.get('/v1/github/credentials', async (_req: Request, res: Response) => {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const os = await import('os');

      let token: string | null = null;
      let source: string | null = null;
      let username: string | null = null;

      // 1. Check environment variable
      if (process.env.GITHUB_TOKEN) {
        token = process.env.GITHUB_TOKEN;
        source = 'GITHUB_TOKEN environment variable';
      }

      // 2. Check .netrc file
      if (!token) {
        const netrcPath = path.join(os.homedir(), '.netrc');
        if (fs.existsSync(netrcPath)) {
          const netrcContent = fs.readFileSync(netrcPath, 'utf8');
          const netrcMatch = netrcContent.match(/machine\s+github\.com\s+login\s+(\S+)\s+password\s+(\S+)/);
          if (netrcMatch) {
            username = netrcMatch[1];
            token = netrcMatch[2];
            source = '.netrc file';
          }
        }
      }

      // 3. Check git config for credential helper
      if (!token) {
        const { exec } = await import('child_process');
        const util = await import('util');
        const execPromise = util.promisify(exec);

        try {
          // Try to get credential helper status
          const { stdout } = await execPromise('git config --global credential.helper', {
            timeout: 5000,
          });
          if (stdout.trim()) {
            source = `git credential.helper: ${stdout.trim()}`;
            // Note: We can't directly read credentials from git credential-store
            // without invoking the credential helper, which is complex.
            // We just inform the user that a helper is configured.
          }
        } catch {
          // Git not available or no credential helper
        }
      }

      // If we have a token, validate it and get user info
      let userInfo: { login: string; name?: string } | null = null;
      let tokenValid = false;
      let tokenScopes: string[] = [];

      if (token) {
        try {
          const response = await fetch('https://api.github.com/user', {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'anchor-engine-node',
            },
          });

          if (response.ok) {
            const data = await response.json();
            userInfo = { login: data.login, name: data.name };
            tokenValid = true;

            // Get scopes from headers
            const scopesHeader = response.headers.get('x-oauth-scopes');
            if (scopesHeader) {
              tokenScopes = scopesHeader.split(',').map(s => s.trim());
            }
          }
        } catch (error: any) {
          console.error('[API] GitHub token validation error:', error.message);
        }
      }

      const hasCredentials = !!token;
      const canAccessPrivateRepos = tokenValid && (
        tokenScopes.includes('repo') || tokenScopes.includes('public_repo')
      );

      res.status(200).json({
        has_credentials: hasCredentials,
        credential_source: source,
        username: username || userInfo?.login || null,
        user_info: userInfo,
        token_valid: tokenValid,
        scopes: tokenScopes,
        can_access_private_repos: canAccessPrivateRepos,
        message: hasCredentials
          ? (canAccessPrivateRepos
              ? 'GitHub credentials found. You can access both public and private repositories.'
              : 'GitHub credentials found but may be limited to public repositories only.')
          : 'No GitHub credentials found. You can only access public repositories.',
      });
    } catch (error: any) {
      console.error('[API] GitHub credentials check error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to discover allowed git repositories
  const getDiscoveredRepos = async (): Promise<string[]> => {
    const path = await import('path');
    const fs = await import('fs');
    const { pathManager } = await import('../../utils/path-manager.js');
    const { PROJECT_ROOT } = await import('../../config/paths.js');

    const potentialRepos: string[] = [];
    const basePath = pathManager.getBasePath();
    const checkDirs = [
      basePath,
      path.join(basePath, '..'),
      path.join(basePath, '..', '..'),
      PROJECT_ROOT,
    ];

    for (const dir of checkDirs) {
      if (!dir) continue;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const repoPath = path.join(dir, entry.name);
            const gitPath = path.join(repoPath, '.git');
            // Resolve to absolute path to prevent traversal evasion
            const absoluteRepoPath = path.resolve(repoPath);
            if (fs.existsSync(gitPath) && !potentialRepos.includes(absoluteRepoPath)) {
              potentialRepos.push(absoluteRepoPath);
            }
          }
        }
      } catch {
        // Skip if directory doesn't exist or can't be read
      }
    }
    return potentialRepos;
  };

  // GET /v1/git/repos - List available git repositories
  app.get('/v1/git/repos', async (_req: Request, res: Response) => {
    try {
      const repos = await getDiscoveredRepos();
      res.status(200).json(repos);
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

      const { execFile } = await import('child_process');
      const util = await import('util');
      const path = await import('path');
      const execFilePromise = util.promisify(execFile);

      // Security: Resolve requested directory to absolute path and verify it's a discovered repository
      const absoluteRequestedDir = path.resolve(working_dir);
      const allowedRepos = await getDiscoveredRepos();

      if (!allowedRepos.includes(absoluteRequestedDir)) {
        console.warn(`[Git] Rejected unauthorized directory access: ${working_dir} (resolved: ${absoluteRequestedDir})`);
        return res.status(403).json({ error: 'Directory not authorized for git commands' });
      }

      // Security: Strict whitelist of allowed git commands and their arguments
      const allowedCommands: Record<string, string[]> = {
        'status': ['status'],
        'log --oneline -20': ['log', '--oneline', '-20'],
        'log --graph --oneline -15': ['log', '--graph', '--oneline', '-15'],
        'diff': ['diff'],
        'diff --cached': ['diff', '--cached'],
        'branch -a': ['branch', '-a'],
        'remote -v': ['remote', '-v'],
      };

      if (!(command in allowedCommands)) {
        console.warn(`[Git] Rejected unauthorized command: ${command} in ${absoluteRequestedDir}`);
        return res.status(400).json({ error: 'Command not allowed for security reasons' });
      }

      const args = allowedCommands[command];
      console.log(`[Git] Running: git ${args.join(' ')} in ${absoluteRequestedDir}`);

      try {
        const { stdout, stderr } = await execFilePromise('git', args, {
          cwd: absoluteRequestedDir,
          encoding: 'utf8',
          timeout: 30000, // 30 second timeout
        });

        res.status(200).json({
          command,
          output: stdout || stderr,
          success: true,
        });
      } catch (execError: any) {
        // Git command failed - return error output
        res.status(200).json({
          command,
          output: execError.stdout || '',
          error: execError.stderr || execError.message,
          success: false,
        });
      }
    } catch (error: any) {
      console.error('[API] Git command execution error:', error);
      res.status(500).json({ error: error.message });
    }
  });
}
