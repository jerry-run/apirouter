import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/server';
import KeyService from '../../src/services/KeyService';
import ProviderService from '../../src/services/ProviderService';

/**
 * Integration tests for complete API flows
 * Tests the interaction between multiple components
 */

describe('API Integration Tests', () => {
  beforeEach(() => {
    KeyService.clear();
    ProviderService.clear();
  });

  describe('Complete Key Management Flow', () => {
    it('should create key, verify, and use in search', async () => {
      // 1. Create API key
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'integration-test-key',
          providers: ['brave'],
        })
        .expect(201);

      expect(createRes.body).toHaveProperty('id');
      expect(createRes.body).toHaveProperty('key');
      const apiKey = createRes.body.key;

      // 2. List keys
      const listRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listRes.body).toHaveLength(1);
      expect(listRes.body[0].name).toBe('integration-test-key');

      // 3. Use key in search request
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test query' })
        .expect(200);

      expect(searchRes.body).toHaveProperty('query', 'test query');
      expect(searchRes.body).toHaveProperty('results');
      expect(searchRes.body).toHaveProperty('executionTime');

      // 4. Get updated key stats
      const getRes = await request(app)
        .get('/api/keys')
        .expect(200);

      const updatedKey = getRes.body[0];
      expect(updatedKey.lastUsedAt).not.toBeNull();
    });

    it('should deny key without brave provider access', async () => {
      // Create key with only openai provider
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'openai-only-key',
          providers: ['openai'],
        })
        .expect(201);

      const apiKey = createRes.body.key;

      // Try to use brave search
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test' })
        .expect(403);

      expect(searchRes.body).toHaveProperty('error');
      expect(searchRes.body.error).toContain('brave');
    });
  });

  describe('Complete Provider Configuration Flow', () => {
    it('should configure provider and check health', async () => {
      // 1. Initialize provider with API key
      const updateRes = await request(app)
        .post('/api/config/providers/brave')
        .send({
          apiKey: 'test-api-key-123',
          baseUrl: 'https://api.search.brave.com',
          rateLimit: 100,
          timeout: 30000,
        })
        .expect(200);

      expect(updateRes.body.name).toBe('brave');
      expect(updateRes.body.isConfigured).toBe(true);

      // 2. Get provider config
      const getRes = await request(app)
        .get('/api/config/providers/brave')
        .expect(200);

      expect(getRes.body.isConfigured).toBe(true);

      // 3. Check provider health
      const checkRes = await request(app)
        .post('/api/config/providers/brave/check')
        .expect(200);

      expect(checkRes.body).toHaveProperty('healthy');
      expect(checkRes.body).toHaveProperty('checkedAt');

      // 4. List all providers
      const listRes = await request(app)
        .get('/api/config/providers')
        .expect(200);

      expect(listRes.body).toContainEqual(
        expect.objectContaining({
          name: 'brave',
          isConfigured: true,
        })
      );
    });
  });

  describe('Multi-Provider Key Flow', () => {
    it('should create key with multiple providers and verify each', async () => {
      // Create multi-provider key
      const createRes = await request(app)
        .post('/api/keys')
        .send({
          name: 'multi-provider-key',
          providers: ['brave', 'openai', 'claude'],
        })
        .expect(201);

      const apiKey = createRes.body.key;

      // Should work with brave
      const braveRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${apiKey}`)
        .send({ q: 'test' })
        .expect(200);

      expect(braveRes.body).toHaveProperty('results');

      // Verify key has all providers
      const getRes = await request(app)
        .get('/api/keys')
        .expect(200);

      const key = getRes.body[0];
      expect(key.providers).toContain('brave');
      expect(key.providers).toContain('openai');
      expect(key.providers).toContain('claude');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle unauthorized API key', async () => {
      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', 'Bearer invalid-key')
        .send({ q: 'test' })
        .expect(403);

      expect(searchRes.body).toHaveProperty('error');
    });

    it('should handle missing query parameter', async () => {
      const key = await KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const searchRes = await request(app)
        .post('/api/proxy/brave/search')
        .set('Authorization', `Bearer ${key.key}`)
        .send({})
        .expect(400);

      expect(searchRes.body).toHaveProperty('error');
    });

    it('should handle invalid provider configuration', async () => {
      const updateRes = await request(app)
        .post('/api/config/providers/invalid-provider')
        .send({ apiKey: 'test-key' })
        .expect(400);

      expect(updateRes.body).toHaveProperty('error');
    });
  });

  describe('Health and Status', () => {
    it('should report healthy status', async () => {
      const healthRes = await request(app)
        .get('/api/health')
        .expect(200);

      expect(healthRes.body).toHaveProperty('status', 'ok');
      expect(healthRes.body).toHaveProperty('timestamp');
    });

    it('should maintain key state across requests', async () => {
      // Create two keys
      const key1Res = await request(app)
        .post('/api/keys')
        .send({ name: 'key1', providers: ['brave'] })
        .expect(201);

      const key2Res = await request(app)
        .post('/api/keys')
        .send({ name: 'key2', providers: ['openai'] })
        .expect(201);

      // Verify both exist
      const listRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(listRes.body).toHaveLength(2);
      expect(listRes.body.map((k: any) => k.name)).toContain('key1');
      expect(listRes.body.map((k: any) => k.name)).toContain('key2');

      // Delete first key
      await request(app)
        .delete(`/api/keys/${key1Res.body.id}`)
        .expect(204);

      // Verify only second key remains
      const finalListRes = await request(app)
        .get('/api/keys')
        .expect(200);

      expect(finalListRes.body).toHaveLength(1);
      expect(finalListRes.body[0].name).toBe('key2');
    });
  });
});
