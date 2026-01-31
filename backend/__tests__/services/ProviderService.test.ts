import { describe, it, expect, beforeEach } from 'vitest';
import ProviderService from '../../src/services/ProviderService';

describe('ProviderService', () => {
  beforeEach(() => {
    ProviderService.clear();
  });

  describe('initializeProvider', () => {
    it('should initialize a provider with default settings', () => {
      const result = ProviderService.initializeProvider('brave');

      expect(result).toBeDefined();
      expect(result.name).toBe('brave');
      expect(result.isConfigured).toBe(false);
      expect(result.lastChecked).toBeNull();
    });

    it('should initialize provider with API key', () => {
      const result = ProviderService.initializeProvider('openai', {
        apiKey: 'sk-test-key',
      });

      expect(result.apiKey).toBe('sk-test-key');
      expect(result.isConfigured).toBe(true);
    });

    it('should normalize provider names to lowercase', () => {
      const result = ProviderService.initializeProvider('BRAVE');

      expect(result.name).toBe('brave');
    });

    it('should throw error for invalid provider', () => {
      expect(() => {
        ProviderService.initializeProvider('invalid-provider');
      }).toThrow('Invalid provider');
    });

    it('should throw error if provider already initialized', () => {
      ProviderService.initializeProvider('brave');

      expect(() => {
        ProviderService.initializeProvider('brave');
      }).toThrow('already initialized');
    });

    it('should initialize with custom settings', () => {
      const result = ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
        baseUrl: 'https://api.search.brave.com',
        rateLimit: 100,
        timeout: 30000,
      });

      const settings = ProviderService.getSettings('brave');
      expect(settings?.baseUrl).toBe('https://api.search.brave.com');
      expect(settings?.rateLimit).toBe(100);
      expect(settings?.timeout).toBe(30000);
    });
  });

  describe('getProvider', () => {
    it('should return provider by name', () => {
      const initialized = ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const result = ProviderService.getProvider('brave');

      expect(result).toBeDefined();
      expect(result?.name).toBe('brave');
      expect(result?.apiKey).toBe('test-key');
    });

    it('should normalize name to lowercase', () => {
      ProviderService.initializeProvider('OpenAI');

      const result = ProviderService.getProvider('OPENAI');

      expect(result).toBeDefined();
      expect(result?.name).toBe('openai');
    });

    it('should return null for non-existent provider', () => {
      const result = ProviderService.getProvider('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('listProviders', () => {
    it('should return empty list initially', () => {
      const result = ProviderService.listProviders();
      expect(result).toEqual([]);
    });

    it('should list all initialized providers', () => {
      ProviderService.initializeProvider('brave');
      ProviderService.initializeProvider('openai');
      ProviderService.initializeProvider('claude');

      const result = ProviderService.listProviders();

      expect(result).toHaveLength(3);
      expect(result.map((p) => p.name)).toEqual(['brave', 'openai', 'claude']);
    });

    it('should include configuration status', () => {
      ProviderService.initializeProvider('brave');
      ProviderService.initializeProvider('openai', { apiKey: 'sk-test' });

      const result = ProviderService.listProviders();

      const brave = result.find((p) => p.name === 'brave');
      const openai = result.find((p) => p.name === 'openai');

      expect(brave?.isConfigured).toBe(false);
      expect(openai?.isConfigured).toBe(true);
    });
  });

  describe('updateProvider', () => {
    it('should update provider settings', () => {
      ProviderService.initializeProvider('brave');

      const result = ProviderService.updateProvider('brave', {
        apiKey: 'new-key',
      });

      expect(result.apiKey).toBe('new-key');
      expect(result.isConfigured).toBe(true);
      expect(result.lastChecked).toBeInstanceOf(Date);
    });

    it('should update custom settings', () => {
      ProviderService.initializeProvider('brave');

      ProviderService.updateProvider('brave', {
        apiKey: 'key',
        baseUrl: 'https://api.brave.com',
        rateLimit: 200,
      });

      const settings = ProviderService.getSettings('brave');
      expect(settings?.baseUrl).toBe('https://api.brave.com');
      expect(settings?.rateLimit).toBe(200);
    });

    it('should preserve existing settings when updating', () => {
      ProviderService.initializeProvider('brave', {
        baseUrl: 'https://original.com',
        rateLimit: 100,
      });

      ProviderService.updateProvider('brave', {
        apiKey: 'new-key',
      });

      const settings = ProviderService.getSettings('brave');
      expect(settings?.baseUrl).toBe('https://original.com');
      expect(settings?.rateLimit).toBe(100);
      expect(settings?.apiKey).toBe('new-key');
    });

    it('should throw error for non-existent provider', () => {
      expect(() => {
        ProviderService.updateProvider('non-existent', {
          apiKey: 'key',
        });
      }).toThrow('not found');
    });

    it('should normalize provider name', () => {
      ProviderService.initializeProvider('brave');

      const result = ProviderService.updateProvider('BRAVE', {
        apiKey: 'new-key',
      });

      expect(result.name).toBe('brave');
    });
  });

  describe('checkProvider', () => {
    it('should check provider connectivity', async () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const result = await ProviderService.checkProvider('brave');

      expect(result).toBe(true);
    });

    it('should return false for unconfigured provider', async () => {
      ProviderService.initializeProvider('brave');

      const result = await ProviderService.checkProvider('brave');

      expect(result).toBe(false);
    });

    it('should update lastChecked timestamp', async () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
      });

      const before = new Date();
      await ProviderService.checkProvider('brave');
      const after = new Date();

      const provider = ProviderService.getProvider('brave');
      expect(provider?.lastChecked).toBeDefined();
      expect(provider!.lastChecked!.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(provider!.lastChecked!.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should throw error for non-existent provider', async () => {
      await expect(ProviderService.checkProvider('non-existent')).rejects.toThrow(
        'not found'
      );
    });
  });

  describe('deleteProvider', () => {
    it('should delete a provider', () => {
      ProviderService.initializeProvider('brave');

      const result = ProviderService.deleteProvider('brave');

      expect(result).toBe(true);
      expect(ProviderService.getProvider('brave')).toBeNull();
    });

    it('should return false for non-existent provider', () => {
      const result = ProviderService.deleteProvider('non-existent');
      expect(result).toBe(false);
    });

    it('should remove settings along with provider', () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'test-key',
        baseUrl: 'https://api.brave.com',
      });

      ProviderService.deleteProvider('brave');

      const settings = ProviderService.getSettings('brave');
      expect(settings).toBeNull();
    });

    it('should normalize provider name', () => {
      ProviderService.initializeProvider('brave');

      const result = ProviderService.deleteProvider('BRAVE');

      expect(result).toBe(true);
      expect(ProviderService.getProvider('brave')).toBeNull();
    });
  });

  describe('getSettings', () => {
    it('should return provider settings', () => {
      ProviderService.initializeProvider('brave', {
        apiKey: 'key',
        baseUrl: 'https://api.com',
      });

      const result = ProviderService.getSettings('brave');

      expect(result?.apiKey).toBe('key');
      expect(result?.baseUrl).toBe('https://api.com');
    });

    it('should return null for non-existent provider', () => {
      const result = ProviderService.getSettings('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('Valid Providers List', () => {
    it('should accept all valid providers', () => {
      const validProviders = ['brave', 'openai', 'claude'];

      validProviders.forEach((provider) => {
        expect(() => {
          ProviderService.initializeProvider(provider);
        }).not.toThrow();
      });
    });

    it('should reject providers not in whitelist', () => {
      const invalidProviders = ['anthropic', 'google', 'azure', 'mistral'];

      invalidProviders.forEach((provider) => {
        expect(() => {
          ProviderService.initializeProvider(provider);
        }).toThrow('Invalid provider');
      });
    });
  });
});
