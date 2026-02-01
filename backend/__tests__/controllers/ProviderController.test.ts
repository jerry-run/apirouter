import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { ProviderController } from '../../src/controllers/ProviderController';
import PrismaService from '../../src/services/PrismaService';

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());

  // Routes
  app.get('/api/config/providers', (req, res) => ProviderController.listProviders(req, res));
  app.post('/api/config/providers/:name', (req, res) => ProviderController.updateProvider(req, res));
  app.get('/api/config/providers/:name', (req, res) => ProviderController.getProvider(req, res));
  app.post('/api/config/providers/:name/check', (req, res) => ProviderController.checkProvider(req, res));
  app.delete('/api/config/providers/:name', (req, res) => ProviderController.deleteProvider(req, res));
});

afterEach(async () => {
  // Clean up database
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  await prisma.apiLog.deleteMany();
  await prisma.usageStats.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.providerConfig.deleteMany();
  await prisma.$disconnect();
});

describe('ProviderController', () => {
  describe('GET /api/config/providers', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should list all providers', async () => {
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' })
        .expect(200);

      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('brave');
    });
  });

  describe('POST /api/config/providers/:name', () => {
    it('should create a new provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'test-api-key',
          rateLimit: 100,
        })
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.apiKey).toBe('test-api-key');
      expect(response.body.rateLimit).toBe(100);
      expect(response.body.isConfigured).toBe(true);
    });

    it('should update existing provider', async () => {
      // Create provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'old-key' });

      // Update provider
      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'new-key', rateLimit: 50 })
        .expect(200);

      expect(response.body.apiKey).toBe('new-key');
      expect(response.body.rateLimit).toBe(50);
    });

    it('should return 400 for missing provider name', async () => {
      const response = await request(app)
        .post('/api/config/providers/')
        .send({ apiKey: 'test-key' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/config/providers/:name', () => {
    it('should return provider config', async () => {
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' });

      const response = await request(app)
        .get('/api/config/providers/brave')
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.isConfigured).toBe(true);
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .get('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/config/providers/:name/check', () => {
    it('should check provider connectivity', async () => {
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' });

      const response = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body).toHaveProperty('healthy');
      expect(response.body).toHaveProperty('checkedAt');
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/non-existent/check')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/config/providers/:name', () => {
    it('should delete a provider', async () => {
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' });

      await request(app)
        .delete('/api/config/providers/brave')
        .expect(204);

      // Verify it's deleted
      const response = await request(app)
        .get('/api/config/providers/brave')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .delete('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
