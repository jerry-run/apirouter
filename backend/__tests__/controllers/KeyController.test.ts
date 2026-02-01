import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { KeyController } from '../../src/controllers/KeyController';
import PrismaService from '../../src/services/PrismaService';

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());

  // Routes
  app.post('/api/keys', (req, res) => KeyController.createKey(req, res));
  app.get('/api/keys', (req, res) => KeyController.listKeys(req, res));
  app.get('/api/keys/:id', (req, res) => KeyController.getKey(req, res));
  app.delete('/api/keys/:id', (req, res) => KeyController.deleteKey(req, res));
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
    });

    it('should return 400 for missing providers', async () => {
      const response = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: [],
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle invalid providers', async () => {
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
      // Create a key first
      await request(app)
        .post('/api/keys')
        .send({
          name: 'key1',
          providers: ['brave'],
        });

      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe('key1');
    });

    it('should return empty list when no keys exist', async () => {
      const response = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('should not include deleted keys', async () => {
      // Create and delete a key
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'key-to-delete',
          providers: ['brave'],
        });

      const keyId = createRes.body.id;

      await request(app)
        .delete(`/api/keys/${keyId}`)
        .expect(204);

      const listRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listRes.body.length).toBe(0);
    });
  });

  describe('GET /api/keys/:id', () => {
    it('should return key by ID', async () => {
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'test-key',
          providers: ['brave'],
        });

      const keyId = createRes.body.id;

      const response = await request(app)
        .get(`/api/keys/${keyId}`)
        .expect(200);

      expect(response.body.id).toBe(keyId);
      expect(response.body.name).toBe('test-key');
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
          name: 'key-to-delete',
          providers: ['brave'],
        });

      const keyId = createRes.body.id;

      await request(app)
        .delete(`/api/keys/${keyId}`)
        .expect(204);

      // Verify it's deleted
      const listRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listRes.body.length).toBe(0);
    });

    it('should return 404 for non-existent key', async () => {
      const response = await request(app)
        .delete('/api/keys/non-existent-id')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });
});
