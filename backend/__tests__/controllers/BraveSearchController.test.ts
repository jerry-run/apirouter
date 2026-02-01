import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { BraveSearchController } from '../../src/controllers/BraveSearchController';
import BraveSearchService from '../../src/services/BraveSearchService';
import PrismaService from '../../src/services/PrismaService';

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

beforeEach(() => {
  app = express();
  app.use(express.json());

  // Routes
  app.post('/api/proxy/brave/search', (req, res) => BraveSearchController.search(req, res));
  app.get('/api/proxy/brave/search', (req, res) => BraveSearchController.searchGet(req, res));
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

describe('BraveSearchController', () => {
  describe('POST /api/proxy/brave/search', () => {
    it('should search without authentication', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should search with authentication token', async () => {
      // Create a key and provider
      const key = await PrismaService.createKey({
        name: 'search-key',
        providers: ['brave'],
      });

      await PrismaService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
    });

    it('should return 403 for unauthorized provider access', async () => {
      // Create a key without brave provider
      const key = await PrismaService.createKey({
        name: 'no-brave-key',
        providers: ['openai'], // No brave access
      });

      await PrismaService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({ q: 'test' })
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });

    it('should record key usage on successful search', async () => {
      // Create a key and provider
      const key = await PrismaService.createKey({
        name: 'usage-key',
        providers: ['brave'],
      });

      const provider = await PrismaService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({ q: 'test' })
        .expect(200);

      // Verify usage was recorded
      const stats = await PrismaService.getUsageStats(key.id);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].requestCount).toBeGreaterThan(0);
    });

    it('should require query parameter', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate count parameter', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: 'test', count: 150 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate safesearch parameter', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: 'test', safesearch: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/proxy/brave/search', () => {
    it('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/proxy/brave/search')
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
    });

    it('should work with authentication header', async () => {
      const key = await PrismaService.createKey({
        name: 'get-key',
        providers: ['brave'],
      });

      await PrismaService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const response = await request(app)
        .get('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('query');
    });
  });
});
