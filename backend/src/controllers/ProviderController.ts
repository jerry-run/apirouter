import { Request, Response } from 'express';
import PrismaService from '../services/PrismaService';

export class ProviderController {
  /**
   * GET /api/config/providers - List all providers
   */
  static async listProviders(_req: Request, res: Response): Promise<void> {
    try {
      const providers = await PrismaService.listProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/config/providers/:name - Initialize or update provider
   */
  static async updateProvider(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;
      const { apiKey, baseUrl, rateLimit, timeout } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      const provider = await PrismaService.updateProvider(name, {
        apiKey,
        baseUrl,
        rateLimit,
        timeout,
      });

      res.json(provider);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * GET /api/config/providers/:name - Get provider config
   */
  static async getProvider(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      const provider = await PrismaService.getProvider(name);

      if (!provider) {
        res.status(404).json({ error: 'Provider not found' });
        return;
      }

      res.json(provider);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/config/providers/:name/check - Verify provider connectivity
   */
  static async checkProvider(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      const isHealthy = await PrismaService.checkProvider(name);

      res.json({
        name,
        healthy: isHealthy,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * DELETE /api/config/providers/:name - Remove provider config
   */
  static async deleteProvider(req: Request, res: Response): Promise<void> {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      await PrismaService.deleteProvider(name);
      res.status(204).send();
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: 'Provider not found' });
      } else if (error instanceof Error) {
        res.status(500).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
}
