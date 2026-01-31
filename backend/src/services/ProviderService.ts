import { ProviderConfig } from '../models/types';

interface ProviderSettings {
  apiKey?: string;
  baseUrl?: string;
  rateLimit?: number;
  timeout?: number;
}

/**
 * Provider Configuration Service
 * Manages settings for each API provider (Brave, OpenAI, Claude, etc.)
 */
class ProviderService {
  private providers: Map<string, ProviderConfig> = new Map();
  private settings: Map<string, ProviderSettings> = new Map();

  private validProviders = ['brave', 'openai', 'claude'];

  /**
   * Initialize a provider with default settings
   */
  initializeProvider(name: string, settings?: ProviderSettings): ProviderConfig {
    const normalized = name.toLowerCase();
    
    if (!this.validProviders.includes(normalized)) {
      throw new Error(`Invalid provider: ${name}`);
    }

    if (this.providers.has(normalized)) {
      throw new Error(`Provider ${name} is already initialized`);
    }

    const config: ProviderConfig = {
      name: normalized,
      apiKey: settings?.apiKey,
      isConfigured: !!settings?.apiKey,
      lastChecked: null,
    };

    this.providers.set(normalized, config);
    this.settings.set(normalized, settings || {});

    return config;
  }

  /**
   * Get provider configuration
   */
  getProvider(name: string): ProviderConfig | null {
    const normalized = name.toLowerCase();
    return this.providers.get(normalized) || null;
  }

  /**
   * List all providers
   */
  listProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * Update provider settings
   */
  updateProvider(name: string, settings: ProviderSettings): ProviderConfig {
    const normalized = name.toLowerCase();
    const provider = this.providers.get(normalized);

    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }

    // Update settings
    const existingSettings = this.settings.get(normalized) || {};
    const updatedSettings = { ...existingSettings, ...settings };
    this.settings.set(normalized, updatedSettings);

    // Update config
    provider.apiKey = settings.apiKey || provider.apiKey;
    provider.isConfigured = !!provider.apiKey;
    provider.lastChecked = new Date();

    return provider;
  }

  /**
   * Check provider connectivity (verify API key works)
   */
  async checkProvider(name: string): Promise<boolean> {
    const normalized = name.toLowerCase();
    const provider = this.providers.get(normalized);

    if (!provider) {
      throw new Error(`Provider ${name} not found`);
    }

    if (!provider.isConfigured) {
      return false;
    }

    // For MVP, just mark as checked
    // In production, would actually test API connectivity
    provider.lastChecked = new Date();
    return true;
  }

  /**
   * Get provider settings (for internal use)
   */
  getSettings(name: string): ProviderSettings | null {
    const normalized = name.toLowerCase();
    return this.settings.get(normalized) || null;
  }

  /**
   * Remove provider configuration
   */
  deleteProvider(name: string): boolean {
    const normalized = name.toLowerCase();
    if (this.providers.delete(normalized)) {
      this.settings.delete(normalized);
      return true;
    }
    return false;
  }

  /**
   * Clear all providers (for testing)
   */
  clear(): void {
    this.providers.clear();
    this.settings.clear();
  }
}

export default new ProviderService();
