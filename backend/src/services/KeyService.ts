import { v4 as uuid } from 'uuid';
import { ApiKey, CreateKeyRequest } from '../models/types';

/**
 * In-memory key storage (TBD: migrate to database)
 */
class KeyService {
  private keys: Map<string, ApiKey> = new Map();

  /**
   * Create a new API key with specified providers
   * @throws Error if providers list is empty or invalid
   */
  createKey(request: CreateKeyRequest): ApiKey {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Key name is required');
    }

    if (!Array.isArray(request.providers) || request.providers.length === 0) {
      throw new Error('At least one provider must be specified');
    }

    const invalidProviders = request.providers.filter((p) => !this.isValidProvider(p));
    if (invalidProviders.length > 0) {
      throw new Error(`Invalid providers: ${invalidProviders.join(', ')}`);
    }

    // Calculate expiration date based on request (default: 90 days)
    const expiresIn = request.expiresIn || '90days';
    let expiresAt: Date | null = null;

    if (expiresIn === '90days') {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (expiresIn === '180days') {
      expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    }
    // if 'never', expiresAt remains null

    const key: ApiKey = {
      id: uuid(),
      name: request.name,
      key: this.generateSecureKey(),
      providers: request.providers,
      createdAt: new Date(),
      expiresAt,
      lastUsedAt: null,
      isActive: true,
    };

    this.keys.set(key.id, key);
    return key;
  }

  /**
   * Get key by ID (partial view - hides sensitive data)
   */
  getKey(id: string): ApiKey | null {
    return this.keys.get(id) || null;
  }

  /**
   * Get key details by key string (for authentication)
   */
  getKeyByString(keyString: string): ApiKey | null {
    const key = Array.from(this.keys.values()).find((k) => k.key === keyString && k.isActive);
    return key || null;
  }

  /**
   * List all active keys (without sensitive data)
   */
  listKeys(): ApiKey[] {
    return Array.from(this.keys.values()).filter((k) => k.isActive);
  }

  /**
   * Verify key is valid, not expired, and has access to provider
   */
  verifyKey(key: string, provider: string): boolean {
    const apiKey = Array.from(this.keys.values()).find((k) => k.key === key && k.isActive);
    if (!apiKey) {
      return false;
    }

    // Check if key has expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return false;
    }

    return apiKey.providers.includes(provider);
  }

  /**
   * Delete (deactivate) a key
   */
  deleteKey(id: string): boolean {
    const key = this.keys.get(id);
    if (!key) {
      return false;
    }
    key.isActive = false;
    this.keys.set(id, key);
    return true;
  }

  /**
   * Mark key as used (for stats)
   */
  recordKeyUsage(key: string): void {
    const apiKey = Array.from(this.keys.values()).find((k) => k.key === key);
    if (apiKey) {
      apiKey.lastUsedAt = new Date();
    }
  }

  /**
   * Clear all keys (for testing)
   */
  clear(): void {
    this.keys.clear();
  }

  // Private helpers
  private generateSecureKey(): string {
    return `ar_${uuid().replace(/-/g, '')}`.substring(0, 32);
  }

  private isValidProvider(provider: string): boolean {
    const validProviders = ['brave', 'openai', 'claude'];
    return validProviders.includes(provider.toLowerCase());
  }
}

export default new KeyService();
