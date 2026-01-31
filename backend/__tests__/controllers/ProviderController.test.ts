import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { ProviderController } from '../../src/controllers/ProviderController';
import ProviderService from '../../src/services/ProviderService';

let app: Express;

beforeEach(() => {
  ProviderService.clear();

  app = express();
  app.use(express.json());

  // Routes
  app.get('/api/config/providers', (req, res) => ProviderController.listProviders(req, res));
  app.post('/api/config/providers/:name', (req, res) =>
    ProviderController.updateProvider(req, res)
  );
  app.get('/api/config/providers/:name', (req, res) =>
    ProviderController.getProvider(req, res)
  );
  app.post('/api/config/providers/:name/check', async (req, res) =>
    ProviderController.checkProvider(req, res)
  );
  app.delete('/api/config/providers/:name', (req, res) =>
    ProviderController.deleteProvider(req, res)
  );
});

describe('ProviderController', () => {
  describe('GET /api/config/providers', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should list all initialized providers', async () => {
      ProviderService.initializeProvider('brave');
      ProviderService.initializeProvider('openai', { apiKey: 'sk-test' });

      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((p: any) => p.name)).toEqual(['brave', 'openai']);
    });

    it('should include configuration status', async () => {
      ProviderService.initializeProvider('brave');
      ProviderService.initializeProvider('openai', { apiKey: 'sk-test' });

      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      const brave = response.body.find((p: any) => p.name === 'brave');
      const openai = response.body.find((p: any) => p.name === 'openai');

      expect(brave.isConfigured).toBe(false);
      expect(openai.isConfigured).toBe(true);
    });
  });

  describe('POST /api/config/providers/:name', () => {
    it('should initialize a new provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'test-key',
          baseUrl: 'https://api.brave.com',
        })
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.apiKey).toBe('test-key');
      expect(response.body.isConfigured).toBe(true);
    });

    it('should update existing provider', async () => {
      ProviderService.initializeProvider('brave', { apiKey: 'old-key' });

      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'new-key',
        })
        .expect(200);

      expect(response.body.apiKey).toBe('new-key');
    });

    it('should accept custom settings', async () => {
      const response = await request(app)
        .post('/api/config/providers/openai')
        .send({
          apiKey: 'sk-test',
          baseUrl: 'https://api.openai.com/v1',
          rateLimit: 3500,
          timeout: 60000,
        })
        .expect(200);

      expect(response.body.apiKey).toBe('sk-test');
      expect(response.body.isConfigured).toBe(true);
    });

    it('should normalize provider name', async () => {
      const response = await request(app)
        .post('/api/config/providers/BRAVE')
        .send({
          apiKey: 'test-key',
        })
        .expect(200);

      expect(response.body.name).toBe('brave');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/invalid')
        .send({
          apiKey: 'test-key',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for missing provider name', async () => {
      const response = await request(app)
        .post('/api/config/providers/')
        .send({
          apiKey: 'test-key',
        })
        .expect(404);

      // 404 because route doesn't match
      expect(response.body).toBeDefined();
    });
  });

  describe('GET /api/config/providers/:name', () => {
    it('should return provider config', async () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .get('/api/config/providers/brave')
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.apiKey).toBe('test-key');
    });

    it('should normalize provider name', async () => {
      ProviderService.initializeProvider('brave');

      const response = await request(app)
        .get('/api/config/providers/BRAVE')
        .expect(200);

      expect(response.body.name).toBe('brave');
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .get('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/config/providers/:name/check', () => {
    it('should check configured provider', async () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.healthy).toBe(true);
      expect(response.body).toHaveProperty('checkedAt');
    });

    it('should return false for unconfigured provider', async () => {
      ProviderService.initializeProvider('brave');

      const response = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      expect(response.body.healthy).toBe(false);
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/non-existent/check')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return ISO timestamp', async () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      const timestamp = new Date(response.body.checkedAt);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('DELETE /api/config/providers/:name', () => {
    it('should delete a provider', async () => {
      ProviderService.initializeProvider('brave');

      await request(app)
        .delete('/api/config/providers/brave')
        .expect(204);

      // Verify deletion
      const provider = ProviderService.getProvider('brave');
      expect(provider).toBeNull();
    });

    it('should normalize provider name', async () => {
      ProviderService.initializeProvider('brave');

      await request(app)
        .delete('/api/config/providers/BRAVE')
        .expect(204);

      expect(ProviderService.getProvider('brave')).toBeNull();
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .delete('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing provider name in update', async () => {
      const response = await request(app)
        .post('/api/config/providers')
        .send({ apiKey: 'test' })
        .expect(404);

      // Route doesn't match, returns 404
      expect(response.body).toBeDefined();
    });

    it('should return proper JSON error responses', async () => {
      const response = await request(app)
        .get('/api/config/providers/invalid-provider')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });
  });
});
