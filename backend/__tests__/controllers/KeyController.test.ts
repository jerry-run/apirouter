import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { KeyController } from '../../src/controllers/KeyController';
import KeyService from '../../src/services/KeyService';

let app: Express;

beforeEach(() => {
  KeyService.clear();

  app = express();
  app.use(express.json());

  // Routes
  app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
  app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));
  app.get('/api/keys/:id', (req, res) => KeyController.getKey(req, res));
  app.delete('/api/keys/:id', (req, res) => KeyController.deleteKey(req, res));
});

describe('KeyController', () => {
  describe('POST /api/keys', () => {
    it('should create a key with valid request', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: ['brave'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body.name).toBe('test-key');
      expect(response.body.providers).toEqual(['brave']);
      expect(response.body.isActive).toBe(true);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should support multiple providers', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'multi-provider',
          providers: ['brave', 'openai'],
        })
        .expect(201);

      expect(response.body.providers).toEqual(['brave', 'openai']);
    });

    it('should return 400 for empty name', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: '',
          providers: ['brave'],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('name');
    });

    it('should return 400 for empty providers', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('provider');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: ['invalid-provider'],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/keys', () => {
    it('should list all active keys', async () => {
      // Create two keys
      const key1 = KeyService.createKey({
        name: 'key1',
        providers: ['brave'],
      });
      const key2 = KeyService.createKey({
        name: 'key2',
        providers: ['openai'],
      });

      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.map((k: any) => k.id)).toContain(key1.id);
      expect(response.body.map((k: any) => k.id)).toContain(key2.id);
    });

    it('should return empty list when no keys exist', async () => {
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should not include deleted keys', async () => {
      const key1 = KeyService.createKey({
        name: 'key1',
        providers: ['brave'],
      });
      const key2 = KeyService.createKey({
        name: 'key2',
        providers: ['openai'],
      });

      KeyService.deleteKey(key1.id);

      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(key2.id);
    });
  });

  describe('GET /api/keys/:id', () => {
    it('should return key by ID', async () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const response = await request(app)
        .get(`/api/keys/${created.id}`)
        .expect(200);

      expect(response.body.id).toBe(created.id);
      expect(response.body.name).toBe('test-key');
      expect(response.body.providers).toEqual(['brave']);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .get('/api/keys/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/keys/:id', () => {
    it('should delete a key', async () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      await request(app)
        .delete(`/api/keys/${created.id}`)
        .expect(204);

      // Verify key is deleted
      const key = KeyService.getKey(created.id);
      expect(key?.isActive).toBe(false);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/keys/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('HTTP Response Format', () => {
    it('should return proper ISO timestamp in createdAt', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: ['brave'],
        })
        .expect(201);

      const timestamp = new Date(response.body.createdAt);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});
