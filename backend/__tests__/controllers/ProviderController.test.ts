import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { ProviderController } from '../../src/controllers/ProviderController';
import { PrismaClient } from '@prisma/client';

let app: Express;

async function cleanupDatabase() {
  for (let i = 0; i < 3; i++) {
    const prisma = new PrismaClient();
    try {
      await prisma.apiLog.deleteMany();
      await prisma.usageStats.deleteMany();
      await prisma.apiKey.deleteMany();
      await prisma.providerConfig.deleteMany();
      break;
    } catch (error) {
      if (i === 2) throw error;
    } finally {
      await prisma.$disconnect();
    }
  }
}

beforeEach(async () => {
  // Clean database before each test
  await cleanupDatabase();
  // Delay to ensure cleanup is complete and connections are released
  await new Promise(r => setTimeout(r, 1000));

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
  // Clean database after each test
  await cleanupDatabase();
  // Delay to ensure cleanup is complete
  await new Promise(r => setTimeout(r, 200));
});

describe('ProviderController', () => {
  describe('GET /api/config/providers', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should list configured provider', async () => {
      // Initialize provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-123' })
        .expect(200);

      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.map((p: any) => p.name)).toContain('brave');
    });

    it('should include configuration status', async () => {
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-123' })
        .expect(200);

      const response = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].isConfigured).toBe(true);
    });
  });

  describe('POST /api/config/providers/:name', () => {
    it('should initialize a new provider', async () => {
      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'brave-key-123',
          rateLimit: 100,
        })
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.apiKey).toBe('brave-key-123');
      expect(response.body.isConfigured).toBe(true);
      expect(response.body.rateLimit).toBe(100);
    });

    it('should update existing provider', async () => {
      // Create provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'old-key' })
        .expect(200);

      // Update it
      const response = await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'new-key' })
        .expect(200);

      expect(response.body.apiKey).toBe('new-key');
    });

    it('should reject invalid provider name', async () => {
      const response = await request(app)
        .post('/api/config/providers/invalid-provider')
        .send({ apiKey: 'some-key' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should support partial updates', async () => {
      // Create provider with defaults
      const createRes = await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-for-update', rateLimit: 100 })
        .expect(200);

      expect(createRes.body.rateLimit).toBe(100);

      // Update only rateLimit
      const updateRes = await request(app)
        .post('/api/config/providers/brave')
        .send({ rateLimit: 200 })
        .expect(200);

      expect(updateRes.body.rateLimit).toBe(200);
    });
  });

  describe('GET /api/config/providers/:name', () => {
    it('should return provider config', async () => {
      // Create provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-123' })
        .expect(200);

      // Get it
      const response = await request(app)
        .get('/api/config/providers/brave')
        .expect(200);

      expect(response.body.name).toBe('brave');
      expect(response.body.apiKey).toBe('brave-key-123');
    });

    it('should return 404 for non-existent provider', async () => {
      const response = await request(app)
        .get('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/config/providers/:name/check', () => {
    it('should return true for configured provider', async () => {
      // Configure provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-123' })
        .expect(200);

      // Check it
      const response = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      expect(response.body.healthy).toBe(true);
    });

    it('should return false for unconfigured provider', async () => {
      // Initialize without apiKey
      await request(app)
        .post('/api/config/providers/brave')
        .send({})
        .expect(200);

      // Check it
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
  });

  describe('DELETE /api/config/providers/:name', () => {
    it('should delete a provider', async () => {
      // Create provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key-123' })
        .expect(200);

      // Delete it
      await request(app)
        .delete('/api/config/providers/brave')
        .expect(204);

      // Verify it's gone
      const response = await request(app)
        .get('/api/config/providers/brave');

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting non-existent provider', async () => {
      const response = await request(app)
        .delete('/api/config/providers/non-existent')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Provider Name Case Insensitivity', () => {
    it('should handle provider names case-insensitively', async () => {
      // Create with uppercase
      await request(app)
        .post('/api/config/providers/BRAVE')
        .send({ apiKey: 'test-key' })
        .expect(200);

      // Get with lowercase
      const response = await request(app)
        .get('/api/config/providers/brave')
        .expect(200);

      expect(response.body.name).toBe('brave');
    });
  });
});
