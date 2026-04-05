import type { Application, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { validate, schemas } from '../../middleware/validate.js';
import { fetchAndProcess, searchWeb } from '../../services/research/researcher.js';
import { ENGINE_PLUGINS } from '../../config/paths.js';

export function setupResearchRoutes(app: Application) {
  // Research Plugin Endpoint
  app.post('/v1/research/scrape', validate(schemas.researchScrape), async (req: Request, res: Response) => {
    try {
      const { url, category } = req.body;
      if (!url) {
        res.status(400).json({ error: 'URL required' });
        return;
      }

      const result = await fetchAndProcess(url, category || 'article');
      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(500).json(result);
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // POST /v1/research/upload-raw - Save raw content as file
  app.post('/v1/research/upload-raw', async (req: Request, res: Response) => {
    try {
      const { content, filename } = req.body;
      if (!content || !filename) {
        res.status(400).json({ error: 'Content and filename required' });
        return;
      }

      // Route to: engine/plugins/articles
      const targetDir = path.join(ENGINE_PLUGINS, 'articles');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      // Fix for Arbitrary File Write via Path Traversal
      // Ensure filename does not contain directory traversal characters
      const safeFilename = path.basename(filename);
      const filePath = path.join(targetDir, safeFilename);
      await fs.promises.writeFile(filePath, content, 'utf8');

      console.log(`[Research] Manual upload saved: ${filePath}`);
      res.status(200).json({ success: true, filePath });

    } catch (e: any) {
      console.error('[Research] Upload failed:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  // Web Search Endpoint
  app.get('/v1/research/web-search', async (req: Request, res: Response) => {
    try {
      const q = req.query.q as string;
      if (!q) {
        res.status(400).json({ error: 'Query required' });
        return;
      }

      const results = await searchWeb(q);
      res.status(200).json(results);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Compatibility: /v1/research/github -> proxy to /v1/github/repos
  app.get('/v1/research/github', async (_req: Request, res: Response) => {
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

  app.post('/v1/research/github', async (req: Request, res: Response) => {
    try {
      const { body } = req;
      // UI sends 'repo', but we also support 'url' for compatibility
      const repoUrl = body.repo || body.url as string;
      const bucket = body.bucket as string || 'code';
      const branch = body.branch as string || 'main';

      if (!repoUrl) {
        res.status(400).json({ error: 'repo (or url) and bucket are required' });
        return;
      }

      const { GitHubIngestService } = await import('../../services/ingest/github-ingest-service.js');
      const service = new GitHubIngestService();

      const repo = await service.registerRepo(repoUrl, bucket);

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
}
