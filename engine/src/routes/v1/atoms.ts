import { Application, Request, Response } from 'express';
import * as crypto from 'crypto';
import { db } from '../../core/db.js';

export function setupAtomRoutes(app: Application) {
  // POST Quarantine Atom (Standard 073)
  app.post('/v1/atoms/:id/quarantine', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Atom ID is required' });
        return;
      }

      console.log(`[API] Quarantining Atom: ${id}`);

      // Update Provenance + Add Tag
      // We use a transaction-like update: Read -> Modify -> Write
      // 1. Get current record
      const check = await db.run(
        `SELECT tags FROM atoms WHERE id = $1`,
        [id]
      );
      if (!check.rows || check.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const currentTags = check.rows[0][0] as string[] || [];
      const newTags = [...new Set([...currentTags, '#manually_quarantined'])];

      // 2. Update Record
      await db.run(
        `UPDATE atoms SET tags = $1, provenance = $2 WHERE id = $3`,
        [newTags, 'quarantine', id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} quarantined.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // GET Quarantined Atoms
  app.get('/v1/atoms/quarantined', async (_req: Request, res: Response) => {
    try {
      const query = `
        SELECT id, content, source_path, timestamp, buckets, tags, provenance, simhash, embedding
        FROM atoms
        WHERE provenance = 'quarantine'
        ORDER BY timestamp DESC
        LIMIT 100
      `;
      const result = await db.run(query);

      const atoms = (result.rows || []).map((row: any) => ({
        id: row.id,
        content: row.content,
        source: row.source_path,
        timestamp: row.timestamp,
        buckets: row.buckets,
        tags: row.tags,
        provenance: row.provenance,
        simhash: row.simhash
      }));

      res.status(200).json(atoms);
    } catch (e: any) {
      console.error('[API] Failed to fetch quarantined atoms:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // PUT Update Atom Content
  app.put('/v1/atoms/:id/content', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;

      console.log(`[API] Updating Atom Content: ${id}`);

      // We must preserve all other fields, BUT zero out embedding to signal re-index needed
      const fullRecord = await db.run(
        `SELECT id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding
         FROM atoms WHERE id = $1`,
        [id]
      );

      if (!fullRecord.rows || fullRecord.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const newHash = crypto.createHash('sha256').update(content).digest('hex');
      const newEmbedding = new Array(384).fill(0.1);

      await db.run(
        `UPDATE atoms SET content = $1, hash = $2, embedding = $3 WHERE id = $4`,
        [content, newHash, newEmbedding, id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} updated.` });

    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  // POST Restore Atom
  app.post('/v1/atoms/:id/restore', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[API] Restoring Atom: ${id}`);

      const fullRecord = await db.run(
        `SELECT id, timestamp, content, source_path, source_id, sequence, type, hash, buckets, epochs, tags, provenance, simhash, embedding
         FROM atoms WHERE id = $1`,
        [id]
      );

      if (!fullRecord.rows || fullRecord.rows.length === 0) {
        res.status(404).json({ error: 'Atom not found' });
        return;
      }

      const row = fullRecord.rows[0];
      const currentTags = row.tags as string[] || [];

      // Filter out quarantine tags
      const newTags = currentTags.filter(t => t !== '#manually_quarantined' && t !== '#auto_quarantined');

      await db.run(
        `UPDATE atoms SET tags = $1, provenance = $2 WHERE id = $3`,
        [newTags, 'internal', id]
      );

      res.status(200).json({ status: 'success', message: `Atom ${id} restored to Graph.` });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });
}
