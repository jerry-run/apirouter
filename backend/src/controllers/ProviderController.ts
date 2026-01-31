import { Request, Response } from 'express';
import ProviderService from '../services/ProviderService';

export class ProviderController {
  /**
   * GET /api/config/providers - List all providers
   */
  static listProviders(_req: Request, res: Response): void {
    try {
      const providers = ProviderService.listProviders();
      res.json(providers);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/config/providers/:name - Initialize or update provider
   */
  static updateProvider(req: Request, res: Response): void {
    try {
      const { name } = req.params;
      const { apiKey, baseUrl, rateLimit, timeout } = req.body;

      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      // Check if provider exists
      let provider = ProviderService.getProvider(name);

      if (!provider) {
        // Initialize new provider
        try {
          provider = ProviderService.initializeProvider(name, {
            apiKey,
            baseUrl,
            rateLimit,
            timeout,
          });
        } catch (error) {
          if (error instanceof Error) {
            res.status(400).json({ error: error.message });
          } else {
            res.status(400).json({ error: 'Failed to initialize provider' });
          }
          return;
        }
      } else {
        // Update existing provider
        provider = ProviderService.updateProvider(name, {
          apiKey,
          baseUrl,
          rateLimit,
          timeout,
        });
      }

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
  static getProvider(req: Request, res: Response): void {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      const provider = ProviderService.getProvider(name);

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

      const isHealthy = await ProviderService.checkProvider(name);

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
  static deleteProvider(req: Request, res: Response): void {
    try {
      const { name } = req.params;

      if (!name) {
        res.status(400).json({ error: 'Provider name is required' });
        return;
      }

      const deleted = ProviderService.deleteProvider(name);

      if (!deleted) {
        res.status(404).json({ error: 'Provider not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
