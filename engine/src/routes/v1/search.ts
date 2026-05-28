import type { Application, Request, Response } from 'express';

export function setupSearchRoutes(app: Application) {
  // Minimal stub implementation - returns empty results
  app.post('/v1/memory/search', async (req: Request, res: Response) => {
    try {
      const query = req.query.query as string || req.body?.query;
      res.json({
        results: [],
        query: query || '',
        total_results: 0,
        message: 'Search stub - no index available yet'
      });
    } catch (e) {
      res.status(500).json({ error: (e as Error).message || 'Search failed' });
    }
  });
}