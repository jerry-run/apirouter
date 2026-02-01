import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { v4 as uuid } from 'uuid';
import { KeyController } from '../../src/controllers/KeyController';
import PrismaService from '../../src/services/PrismaService';
import { PrismaClient } from '@prisma/client';

let app: Express;

async function cleanupDatabase() {
  // Try multiple times to ensure cleanup
  for (let i = 0; i < 3; i++) {
    const prisma = new PrismaClient();
    try {
      await prisma.apiLog.deleteMany();
      await prisma.usageStats.deleteMany();
      await prisma.apiKey.deleteMany();
      await prisma.providerConfig.deleteMany();
      break; // Success
    } catch (error) {
      if (i === 2) throw error; // Final attempt failed
    } finally {
      await prisma.$disconnect();
    }
  }
}

beforeEach(async () => {
  // Clean database before each test
  await cleanupDatabase();
  // Delay to ensure cleanup is complete
  await new Promise(r => setTimeout(r, 50));

  app = express();
  app.use(express.json());

  // Routes
  app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
  app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));
  app.get('/api/keys/:id', (req, res) => KeyController.getKey(req, res));
  app.delete('/api/keys/:id', (req, res) => KeyController.deleteKey(req, res));
});

afterEach(async () => {
  // Clean database after each test
  await cleanupDatabase();
});

describe('KeyController', () => {
  describe('POST /api/keys', () => {
    it('should create a key with valid request', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: `test-key-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('key');
      expect(response.body.key).toMatch(/^ar_/); // Key starts with ar_
      expect(response.body.providers).toEqual(['brave']);
      expect(response.body.isActive).toBe(true);
      expect(response.body).toHaveProperty('createdAt');
    });

    it('should support multiple providers', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: `multi-provider-${uuid()}`,
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
    });

    it('should return 400 for empty providers', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: `test-key-${uuid()}`,
          providers: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for invalid provider', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: `test-key-${uuid()}`,
          providers: ['invalid-provider'],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/keys', () => {
    it('should list all active keys', async () => {
      // Create two keys
      await request(app)
        .post('/api/keys')
        .send({
          name: `key1-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      await request(app)
        .post('/api/keys')
        .send({
          name: `key2-${uuid()}`,
          providers: ['openai'],
        })
        .expect(201);

      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body.every((k: any) => k.isActive === true)).toBe(true);
    });

    it('should return empty list when no keys exist', async () => {
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should delete keys properly', async () => {
      // Create key
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: `key-to-delete-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      const keyId = createRes.body.id;

      // Delete it
      await request(app)
        .delete(`/api/keys/${keyId}`)
        .expect(204);

      // Try to get deleted key - should be 404 or inactive
      const getRes = await request(app)
        .get(`/api/keys/${keyId}`);

      // Either 404 or should be inactive
      if (getRes.status === 200) {
        expect(getRes.body.isActive).toBe(false);
      } else {
        expect(getRes.status).toBe(404);
      }
    });
  });

  describe('GET /api/keys/:id', () => {
    it('should return key by ID', async () => {
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: `test-key-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      const keyId = createRes.body.id;

      const response = await request(app)
        .get(`/api/keys/${keyId}`)
        .expect(200);

      expect(response.body.id).toBe(keyId);
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
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: `key-to-delete-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      const keyId = createRes.body.id;

      await request(app)
        .delete(`/api/keys/${keyId}`)
        .expect(204);

      // Verify it's deleted
      const getRes = await request(app)
        .get(`/api/keys/${keyId}`);

      // Should be inactive or return 404
      if (getRes.status === 200) {
        expect(getRes.body.isActive).toBe(false);
      } else {
        expect(getRes.status).toBe(404);
      }
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
          name: `test-key-${uuid()}`,
          providers: ['brave'],
        })
        .expect(201);

      const timestamp = new Date(response.body.createdAt);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});
