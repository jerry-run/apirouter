import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { verifyApiKey, requireProvider } from '../../src/middleware/auth';

let app: Express;

beforeEach(() => {
  app = express();
  app.use(express.json());
});

describe('Authentication Middleware', () => {
  describe('verifyApiKey', () => {
    beforeEach(() => {
      app.get('/protected', verifyApiKey, (_req, res) => {
        res.json({ message: 'authorized' });
      });
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app)
        .get('/protected')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('authorization');
    });

    it('should reject invalid authorization scheme', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Basic invalid')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('scheme');
    });

    it('should reject missing API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('key');
    });

    it('should reject invalid API key format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer invalid-key-format')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('format');
    });

    it('should accept valid Bearer format', async () => {
      // This will proceed to next middleware/route handler
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ar_1234567890abcdef')
        .expect(200);

      expect(response.body.message).toBe('authorized');
    });

    it('should handle empty Bearer token gracefully', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('requireProvider', () => {
    beforeEach(() => {
      // Setup route with provider requirement
      app.get(
        '/brave-required',
        (req, _res, next) => {
          // Mock setting keyProviders (in real app, this comes from verifyApiKey)
          req.keyProviders = req.query.providers
            ? (req.query.providers as string).split(',')
            : [];
          next();
        },
        requireProvider('brave'),
        (_req, res) => {
          res.json({ message: 'brave authorized' });
        }
      );
    });

    it('should allow access if key has required provider', async () => {
      const response = await request(app)
        .get('/brave-required?providers=brave')
        .expect(200);

      expect(response.body.message).toBe('brave authorized');
    });

    it('should allow access if key has multiple providers including required one', async () => {
      const response = await request(app)
        .get('/brave-required?providers=brave,openai')
        .expect(200);

      expect(response.body.message).toBe('brave authorized');
    });

    it('should deny access if key lacks required provider', async () => {
      const response = await request(app)
        .get('/brave-required?providers=openai')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('brave');
      expect(response.body.error).toContain('authorized');
    });

    it('should deny access if key has no providers', async () => {
      const response = await request(app)
        .get('/brave-required')
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Authorization Header Parsing', () => {
    it('should handle case-insensitive Bearer scheme', async () => {
      app.get('/test', verifyApiKey, (_req, res) => {
        res.json({ ok: true });
      });

      // Note: HTTP spec says scheme is case-insensitive, but implementation here is case-sensitive
      // This test documents current behavior
      const response = await request(app)
        .get('/test')
        .set('Authorization', 'bearer ar_test123')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle whitespace in authorization header', async () => {
      app.get('/test', verifyApiKey, (_req, res) => {
        res.json({ ok: true });
      });

      const response = await request(app)
        .get('/test')
        .set('Authorization', '  Bearer  ar_test123  ')
        .expect(401);

      // Current implementation may fail due to split behavior
      expect(response.body).toHaveProperty('error');
    });
  });
});
