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
  describe('verifyApiKey - Format Validation', () => {
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
      expect(response.body.error).toContain('Missing authorization header');
    });

    it('should reject invalid authorization scheme', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Basic invalid')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid authorization scheme');
    });

    it('should reject missing API key', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer ')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid API key format', async () => {
      const response = await request(app)
        .get('/protected')
        .set('Authorization', 'Bearer sk_invalid')
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Invalid API key format');
    });

    it('should accept valid Bearer format', async () => {
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

  describe('requireProvider - Provider Restriction', () => {
    beforeEach(() => {
      app.get('/brave-protected',
        verifyApiKey,
        requireProvider('brave'),
        (_req, res) => {
          res.json({ message: 'brave authorized' });
        }
      );
    });

    it('should reject request without provider set', async () => {
      const response = await request(app)
        .get('/brave-protected')
        .set('Authorization', 'Bearer ar_valid_key')
        .expect(403);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('brave');
      expect(response.body.error).toContain('not authorized');
    });

    it('should pass when provider is explicitly set', async () => {
      app = express();
      app.use(express.json());
      
      // Route with pre-set provider
      app.get('/brave-protected',
        verifyApiKey,
        (req, res, next) => {
          req.keyProviders = ['brave'];
          next();
        },
        requireProvider('brave'),
        (_req, res) => {
          res.json({ message: 'brave authorized' });
        }
      );

      const response = await request(app)
        .get('/brave-protected')
        .set('Authorization', 'Bearer ar_valid_key')
        .expect(200);

      expect(response.body.message).toBe('brave authorized');
    });
  });
});
