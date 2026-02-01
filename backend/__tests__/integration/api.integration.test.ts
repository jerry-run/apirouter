import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { KeyController } from '../../src/controllers/KeyController';
import { ProviderController } from '../../src/controllers/ProviderController';
import { BraveSearchController } from '../../src/controllers/BraveSearchController';
import PrismaService from '../../src/services/PrismaService';

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());

  // Key routes
  app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
  app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));

  // Provider routes
  app.get('/api/config/providers', (req, res) => ProviderController.listProviders(req, res));
  app.post('/api/config/providers/:name', (req, res) => ProviderController.updateProvider(req, res));

  // Search routes
  app.post('/api/proxy/brave/search', (req, res) => BraveSearchController.search(req, res));

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
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

describe('API Integration Tests', () => {
  describe('Complete Key Management Flow', () => {
    it('should create key, verify, and use in search', async () => {
      // Create key
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'integration-test-key',
          providers: ['brave'],
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('key');
      const apiKey = createRes.body.key;

      // Create provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-brave-key' })
        .expect(200);

      // Use in search
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test' })
        .expect(200);

      expect(searchRes.body).toHaveProperty('results');
    });

    it('should deny key without brave provider access', async () => {
      // Create key without brave
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'no-brave-key',
          providers: ['openai'],
        })
        .expect(201);

      const apiKey = createRes.body.key;

      // Create brave provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' })
        .expect(200);

      // Try to search - should fail
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test' })
        .expect(403);

      expect(searchRes.body).toHaveProperty('error');
    });
  });

  describe('Complete Provider Configuration Flow', () => {
    it('should configure provider and check health', async () => {
      // Configure provider
      const configRes = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'test-api-key',
          rateLimit: 100,
        })
        .expect(200);

      expect(configRes.body.isConfigured).toBe(true);

      // List providers
      const listRes = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(listRes.body.length).toBe(1);
      expect(listRes.body[0].name).toBe('brave');
    });
  });

  describe('Multi-Provider Key Flow', () => {
    it('should create key with multiple providers and verify each', async () => {
      // Create key with multiple providers
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'multi-key',
          providers: ['brave', 'openai'],
        })
        .expect(201);

      const apiKey = createRes.body.key;
      expect(createRes.body.providers).toEqual(['brave', 'openai']);

      // Configure both providers
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'brave-key' })
        .expect(200);

      await request(app)
        .post('/api/config/providers/openai')
        .send({ apiKey: 'openai-key' })
        .expect(200);

      // Verify key can access brave
      const braveRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test' })
        .expect(200);

      expect(braveRes.body).toHaveProperty('results');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle unauthorized API key', async () => {
      // Configure provider
      await request(app)
        .post('/api/config/providers/brave')
        .send({ apiKey: 'test-key' })
        .expect(200);

      // Try with invalid key
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', 'Bearer invalid-key')
        .send({ q: 'test' })
        .expect(403);

      expect(searchRes.body).toHaveProperty('error');
    });

    it('should handle missing search query', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Health and Status', () => {
    it('should report health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should maintain key state across requests', async () => {
      // Create two keys
      const res1 = await request(app)
        .post('/api/keys')
        .send({ name: 'key1', providers: ['brave'] })
        .expect(201);

      const res2 = await request(app)
        .post('/api/keys')
        .send({ name: 'key2', providers: ['brave'] })
        .expect(201);

      // List keys
      const listRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listRes.body.length).toBe(2);
      expect(listRes.body.map((k: any) => k.name)).toEqual(['key1', 'key2']);
    });
  });
});
