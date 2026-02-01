import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { KeyController } from '../../src/controllers/KeyController';
import { ProviderController } from '../../src/controllers/ProviderController';
import { BraveSearchController } from '../../src/controllers/BraveSearchController';
import BraveSearchService from '../../src/services/BraveSearchService';
import { PrismaClient } from '@prisma/client';
import { vi } from 'vitest';

// Mock BraveSearchService
vi.mock('../../src/services/BraveSearchService', () => ({
  default: {
    search: vi.fn().mockResolvedValue({
      query: 'test',
      results: [
        { title: 'Result 1', url: 'https://example.com/1', description: 'Test result' },
      ],
      resultCount: 1,
      executionTime: 100,
    }),
  },
}));

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
  await cleanupDatabase();
  // Delay to ensure cleanup is complete and connections are released
  await new Promise(r => setTimeout(r, 300));

  app = express();
  app.use(express.json());

  app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
  app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));
  app.get('/api/keys/:id', (req, res) => KeyController.getKey(req, res));
  app.delete('/api/keys/:id', (req, res) => KeyController.deleteKey(req, res));

  app.get('/api/config/providers', (req, res) => ProviderController.listProviders(req, res));
  app.post('/api/config/providers/:name', (req, res) => ProviderController.updateProvider(req, res));
  app.get('/api/config/providers/:name', (req, res) => ProviderController.getProvider(req, res));
  app.post('/api/config/providers/:name/check', (req, res) => ProviderController.checkProvider(req, res));
  app.delete('/api/config/providers/:name', (req, res) => ProviderController.deleteProvider(req, res));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
});

afterEach(async () => {
  await cleanupDatabase();
  // Delay to ensure cleanup is complete
  await new Promise(r => setTimeout(r, 200));
});

describe('API Integration Tests', () => {
  it('should create a key', async () => {
    const res = await request(app)
      .post('/api/keys')
      .send({ name: `key-${uuid()}`, providers: ['brave'] })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('key');
  });

  it('should list keys', async () => {
    const res = await request(app)
      .get('/api/keys')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should configure a provider', async () => {
    const res = await request(app)
      .post('/api/config/providers/brave')
      .send({ apiKey: 'test-key' })
      .expect(200);

    expect(res.body.name).toBe('brave');
    expect(res.body.isConfigured).toBe(true);
  });

  it('should list providers', async () => {
    await request(app)
      .post('/api/config/providers/brave')
      .send({ apiKey: 'test-key' })
      .expect(200);

    const res = await request(app)
      .get('/api/config/providers')
      .expect(200);

    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe('brave');
  });

  it('should check provider status', async () => {
    await request(app)
      .post('/api/config/providers/brave')
      .send({ apiKey: 'test-key' })
      .expect(200);

    const res = await request(app)
      .post('/api/config/providers/brave/check')
      .expect(200);

    expect(res.body).toHaveProperty('healthy');
  });

  it('should report health', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
  });

  it('should handle complete workflow', async () => {
    // Create key
    const keyRes = await request(app)
      .post('/api/keys')
      .send({ name: `workflow-key-${uuid()}`, providers: ['brave'] })
      .expect(201);

    expect(keyRes.body).toHaveProperty('id');
    expect(keyRes.body).toHaveProperty('key');

    // Configure provider
    const provRes = await request(app)
      .post('/api/config/providers/brave')
      .send({ apiKey: 'test-key' })
      .expect(200);

    expect(provRes.body.isConfigured).toBe(true);
  });

  it('should create multiple keys', async () => {
    const key1Res = await request(app)
      .post('/api/keys')
      .send({ name: `key1-${uuid()}`, providers: ['brave'] })
      .expect(201);

    const key2Res = await request(app)
      .post('/api/keys')
      .send({ name: `key2-${uuid()}`, providers: ['openai'] })
      .expect(201);

    expect(key1Res.body.id).toBeTruthy();
    expect(key2Res.body.id).toBeTruthy();
  });

  it('should create multiple providers', async () => {
    const bravRes = await request(app)
      .post('/api/config/providers/brave')
      .send({ apiKey: 'brave-key' })
      .expect(200);

    const openaiRes = await request(app)
      .post('/api/config/providers/openai')
      .send({ apiKey: 'openai-key' })
      .expect(200);

    expect(bravRes.body.name).toBe('brave');
    expect(openaiRes.body.name).toBe('openai');
  });
});
