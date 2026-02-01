import { Request, Response } from 'express';
import PrismaService from '../services/PrismaService';
import { CreateKeyRequest, KeyResponse } from '../models/types';

export class KeyController {
  /**
   * POST /api/keys - Create a new API key
   */
  static async createKey(req: Request, res: Response): Promise<void> {
    try {
      const { name, providers } = req.body as CreateKeyRequest;

      const key = await PrismaService.createKey({ name, providers });

      const response: KeyResponse = {
        id: key.id,
        name: key.name,
        key: key.key,
        providers: key.providers,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
        lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        isActive: key.isActive,
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }

  /**
   * GET /api/keys - List all active keys
   */
  static async listKeys(_req: Request, res: Response): Promise<void> {
    try {
      const keys = await PrismaService.listKeys();

      const responses: KeyResponse[] = keys.map((key) => ({
        id: key.id,
        name: key.name,
        key: key.key,
        providers: key.providers,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
        lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        isActive: key.isActive,
      }));

      res.json(responses);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/keys/:id - Get key by ID
   */
  static async getKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const key = await PrismaService.getKey(id);

      if (!key) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      const response: KeyResponse = {
        id: key.id,
        name: key.name,
        key: key.key,
        providers: key.providers,
        createdAt: key.createdAt.toISOString(),
        expiresAt: key.expiresAt ? key.expiresAt.toISOString() : null,
        lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
        isActive: key.isActive,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /api/keys/:id - Delete (deactivate) a key
   */
  static async deleteKey(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await PrismaService.deleteKey(id);

      if (!deleted) {
        res.status(404).json({ error: 'Key not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
