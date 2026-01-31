import { describe, it, expect, beforeEach } from 'vitest';
import KeyService from '../../src/services/KeyService';

describe('KeyService', () => {
  beforeEach(() => {
    KeyService.clear();
  });

  describe('createKey', () => {
    it('should create a new key with valid providers', () => {
      const result = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.key).toBeDefined();
      expect(result.name).toBe('test-key');
      expect(result.providers).toEqual(['brave']);
      expect(result.isActive).toBe(true);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for each key', () => {
      const key1 = KeyService.createKey({
        name: 'key1',
        providers: ['brave'],
      });
      const key2 = KeyService.createKey({
        name: 'key2',
        providers: ['openai'],
      });

      expect(key1.id).not.toBe(key2.id);
      expect(key1.key).not.toBe(key2.key);
    });

    it('should support multiple providers per key', () => {
      const result = KeyService.createKey({
        name: 'multi-provider',
        providers: ['brave', 'openai', 'claude'],
      });

      expect(result.providers).toEqual(['brave', 'openai', 'claude']);
    });

    it('should throw error if name is empty', () => {
      expect(() =>
        KeyService.createKey({
          name: '',
          providers: ['brave'],
        })
      ).toThrow('Key name is required');
    });

    it('should throw error if providers list is empty', () => {
      expect(() =>
        KeyService.createKey({
          name: 'test-key',
          providers: [],
        })
      ).toThrow('At least one provider must be specified');
    });

    it('should throw error for invalid provider', () => {
      expect(() =>
        KeyService.createKey({
          name: 'test-key',
          providers: ['invalid-provider'],
        })
      ).toThrow('Invalid providers');
    });

    it('should throw error for mixed valid and invalid providers', () => {
      expect(() =>
        KeyService.createKey({
          name: 'test-key',
          providers: ['brave', 'invalid'],
        })
      ).toThrow('Invalid providers');
    });
  });

  describe('getKey', () => {
    it('should return key by ID', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const retrieved = KeyService.getKey(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent key', () => {
      const result = KeyService.getKey('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listKeys', () => {
    it('should return empty list initially', () => {
      const result = KeyService.listKeys();
      expect(result).toEqual([]);
    });

    it('should list all active keys', () => {
      const key1 = KeyService.createKey({
        name: 'key1',
        providers: ['brave'],
      });
      const key2 = KeyService.createKey({
        name: 'key2',
        providers: ['openai'],
      });

      const result = KeyService.listKeys();

      expect(result).toHaveLength(2);
      expect(result.map((k) => k.id)).toContain(key1.id);
      expect(result.map((k) => k.id)).toContain(key2.id);
    });

    it('should not list deleted (inactive) keys', () => {
      const key1 = KeyService.createKey({
        name: 'key1',
        providers: ['brave'],
      });
      const key2 = KeyService.createKey({
        name: 'key2',
        providers: ['openai'],
      });

      KeyService.deleteKey(key1.id);

      const result = KeyService.listKeys();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(key2.id);
    });
  });

  describe('verifyKey', () => {
    it('should verify valid key with correct provider', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave', 'openai'],
      });

      const result = KeyService.verifyKey(created.key, 'brave');

      expect(result).toBe(true);
    });

    it('should return false for invalid key string', () => {
      const result = KeyService.verifyKey('invalid-key', 'brave');
      expect(result).toBe(false);
    });

    it('should return false for valid key but unauthorized provider', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const result = KeyService.verifyKey(created.key, 'openai');

      expect(result).toBe(false);
    });

    it('should return false for deleted key', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      KeyService.deleteKey(created.id);

      const result = KeyService.verifyKey(created.key, 'brave');

      expect(result).toBe(false);
    });

    it('should verify all providers for multi-provider key', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave', 'openai', 'claude'],
      });

      expect(KeyService.verifyKey(created.key, 'brave')).toBe(true);
      expect(KeyService.verifyKey(created.key, 'openai')).toBe(true);
      expect(KeyService.verifyKey(created.key, 'claude')).toBe(true);
    });
  });

  describe('deleteKey', () => {
    it('should deactivate (soft delete) a key', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      const result = KeyService.deleteKey(created.id);

      expect(result).toBe(true);
      expect(KeyService.getKey(created.id)?.isActive).toBe(false);
    });

    it('should return false for non-existent key', () => {
      const result = KeyService.deleteKey('non-existent');
      expect(result).toBe(false);
    });

    it('should prevent deleted key usage', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      KeyService.deleteKey(created.id);

      const result = KeyService.verifyKey(created.key, 'brave');

      expect(result).toBe(false);
    });
  });

  describe('recordKeyUsage', () => {
    it('should update lastUsedAt timestamp', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      expect(created.lastUsedAt).toBeNull();

      KeyService.recordKeyUsage(created.key);

      const updated = KeyService.getKey(created.id);
      expect(updated?.lastUsedAt).toBeInstanceOf(Date);
    });

    it('should not fail for invalid key', () => {
      expect(() => KeyService.recordKeyUsage('invalid-key')).not.toThrow();
    });
  });

  describe('key format', () => {
    it('should generate keys with ar_ prefix', () => {
      const created = KeyService.createKey({
        name: 'test-key',
        providers: ['brave'],
      });

      expect(created.key).toMatch(/^ar_/);
    });

    it('should generate consistent key length', () => {
      const keys = Array.from({ length: 10 }, () =>
        KeyService.createKey({
          name: 'test',
          providers: ['brave'],
        })
      );

      const lengths = keys.map((k) => k.key.length);
      expect(new Set(lengths).size).toBe(1);
    });
  });
});
