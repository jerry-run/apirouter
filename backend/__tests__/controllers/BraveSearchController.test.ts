import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { BraveSearchController } from '../../src/controllers/BraveSearchController';
import KeyService from '../../src/services/KeyService';
import ProviderService from '../../src/services/ProviderService';

let app: Express;

beforeEach(() => {
  KeyService.clear();
  ProviderService.clear();

  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.post('/api/proxy/brave/search', async (req, res) =>
    BraveSearchController.search(req, res)
  );
  app.get('/api/proxy/brave/search', async (req, res) =>
    BraveSearchController.searchGet(req, res)
  );
});

describe('BraveSearchController', () => {
  describe('POST /api/proxy/brave/search', () => {
    it('should search without authentication', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'javascript testing',
        })
        .expect(200);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('resultCount');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.query).toBe('javascript testing');
    });

    it('should search with authentication token', async () => {
      const key = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const response = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({
          q: 'test query',
        })
        .expect(200);

      expect(response.body.query).toBe('test query');
    });

    it('should return 400 for missing query', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('query');
    });

    it('should return 400 for empty query', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for whitespace-only query', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: '   ' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept optional parameters', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'test',
          count: 5,
          offset: 10,
          safesearch: 'strict',
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 for invalid count', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'test',
          count: 999,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Count');
    });

    it('should return 400 for negative offset', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'test',
          offset: -5,
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid safesearch', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'test',
          safesearch: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 403 for unauthorized provider access', async () => {
      const key = KeyService.createKey({
        name: 'test-key',
        providers: ['openai'], // Only openai, not brave
      });

      const response = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({
          q: 'test',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('brave');
    });

    it('should record key usage on successful search', async () => {
      const key = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      expect(KeyService.getKey(key.id)?.lastUsedAt).toBeNull();

      await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({
          q: 'test',
        })
        .expect(200);

      const updated = KeyService.getKey(key.id);
      expect(updated?.lastUsedAt).not.toBeNull();
    });

    it('should include ISO timestamp in response', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({
          q: 'test',
        })
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });

  describe('GET /api/proxy/brave/search', () => {
    it('should search with query parameters', async () => {
      const response = await request(app)
        .get('/api/proxy/brave/search')
        .query({ q: 'javascript' })
        .expect(200);

      expect(response.body.query).toBe('javascript');
    });

    it('should accept all query parameters via GET', async () => {
      const response = await request(app)
        .get('/api/proxy/brave/search')
        .query({
          q: 'test',
          count: '5',
          offset: '10',
          safesearch: 'strict',
        })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 400 for missing query parameter', async () => {
      const response = await request(app)
        .get('/api/proxy/brave/search')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should work with authentication header', async () => {
      const key = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const response = await request(app)
        .get('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .query({ q: 'test' })
        .expect(200);

      expect(response.body.query).toBe('test');
    });
  });

  describe('Search Result Structure', () => {
    it('should return proper result structure', async () => {
      const response = await request(app)
        .post('/api/proxy/brave/search')
        .send({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('query');
      expect(response.body).toHaveProperty('results');
      expect(response.body).toHaveProperty('resultCount');
      expect(response.body).toHaveProperty('executionTime');
      expect(response.body).toHaveProperty('timestamp');

      response.body.results.forEach((result: any) => {
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('description');
      });
    });
  });
});
