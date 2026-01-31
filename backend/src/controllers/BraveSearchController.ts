import { Request, Response } from 'express';
import BraveSearchService, { SearchQuery } from '../services/BraveSearchService';
import KeyService from '../services/KeyService';

export class BraveSearchController {
  /**
   * POST /api/proxy/brave/search - Search via Brave Search API
   * Requires API key in Authorization header
   */
  static async search(req: Request, res: Response): Promise<void> {
    try {
      const { q, count, offset, safesearch } = req.body;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
      }

      // Verify API key has access to brave provider
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const [, key] = authHeader.split(' ');
        if (key && !KeyService.verifyKey(key, 'brave')) {
          res.status(403).json({ error: 'This key does not have access to brave provider' });
          return;
        }

        // Record usage
        KeyService.recordKeyUsage(key);
      }

      const query: SearchQuery = {
        q: q.trim(),
        count: count ? parseInt(count as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        safesearch: safesearch as 'off' | 'moderate' | 'strict' | undefined,
      };

      // Validate count parameter
      if (query.count !== undefined && (query.count < 1 || query.count > 100)) {
        res.status(400).json({ error: 'Count must be between 1 and 100' });
        return;
      }

      // Validate offset parameter
      if (query.offset !== undefined && query.offset < 0) {
        res.status(400).json({ error: 'Offset must be non-negative' });
        return;
      }

      // Validate safesearch parameter
      if (
        query.safesearch &&
        !['off', 'moderate', 'strict'].includes(query.safesearch)
      ) {
        res
          .status(400)
          .json({ error: 'Safesearch must be one of: off, moderate, strict' });
        return;
      }

      const result = await BraveSearchService.search(query);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * GET /api/proxy/brave/search - Search via GET (query param)
   */
  static async searchGet(req: Request, res: Response): Promise<void> {
    try {
      const { q, count, offset, safesearch } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
      }

      // Verify API key has access to brave provider
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const [, key] = authHeader.split(' ');
        if (key && !KeyService.verifyKey(key, 'brave')) {
          res.status(403).json({ error: 'This key does not have access to brave provider' });
          return;
        }

        // Record usage
        KeyService.recordKeyUsage(key);
      }

      const query = {
        q: q.trim(),
        count: count ? parseInt(count as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        safesearch: safesearch as 'off' | 'moderate' | 'strict' | undefined,
      };

      const result = await BraveSearchService.search(query);

      res.json({
        ...result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('required')) {
        res.status(400).json({ error: error.message });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
