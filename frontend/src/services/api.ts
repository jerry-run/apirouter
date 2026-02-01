/**
 * API Service - Handles all communication with backend
 */

const API_BASE = '/api';

// Retry logic for failed requests
async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries: number = 3,
  timeout: number = 10000
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (err) {
      if (i === maxRetries - 1) {
        throw new Error(
          `Backend is not responding. Please check if the server is running. (${err instanceof Error ? err.message : 'Network error'})`
        );
      }
      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, 500 * (i + 1)));
    }
  }
  throw new Error('Backend is not responding. Please check if the server is running.');
}

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  providers: string[];
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  isActive: boolean;
}

export interface ProviderConfig {
  name: string;
  apiKey?: string;
  isConfigured: boolean;
  lastChecked: string | null;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface BraveSearchResponse {
  query: string;
  results: SearchResult[];
  resultCount: number;
  executionTime: number;
  timestamp: string;
}

// Keys API
export const keysApi = {
  async create(
    name: string,
    providers: string[],
    expiresIn: 'never' | '90days' | '180days' = '90days'
  ): Promise<ApiKey> {
    const response = await fetchWithRetry(`${API_BASE}/keys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, providers, expiresIn }),
    });
    if (!response.ok) throw new Error('Failed to create key');
    return response.json();
  },

  async list(): Promise<ApiKey[]> {
    const response = await fetchWithRetry(`${API_BASE}/keys`);
    if (!response.ok) throw new Error('Failed to fetch keys');
    return response.json();
  },

  async get(id: string): Promise<ApiKey> {
    const response = await fetchWithRetry(`${API_BASE}/keys/${id}`);
    if (!response.ok) throw new Error('Failed to fetch key');
    return response.json();
  },

  async delete(id: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/keys/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete key');
  },
};

// Providers API
export const providersApi = {
  async list(): Promise<ProviderConfig[]> {
    const response = await fetchWithRetry(`${API_BASE}/config/providers`);
    if (!response.ok) throw new Error('Failed to fetch providers');
    return response.json();
  },

  async get(name: string): Promise<ProviderConfig> {
    const response = await fetchWithRetry(`${API_BASE}/config/providers/${name}`);
    if (!response.ok) throw new Error('Failed to fetch provider');
    return response.json();
  },

  async update(
    name: string,
    data: { apiKey?: string; baseUrl?: string; rateLimit?: number; timeout?: number }
  ): Promise<ProviderConfig> {
    const response = await fetchWithRetry(`${API_BASE}/config/providers/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update provider');
    return response.json();
  },

  async check(name: string): Promise<{ name: string; healthy: boolean; checkedAt: string }> {
    const response = await fetchWithRetry(`${API_BASE}/config/providers/${name}/check`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to check provider');
    return response.json();
  },

  async delete(name: string): Promise<void> {
    const response = await fetchWithRetry(`${API_BASE}/config/providers/${name}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete provider');
  },
};

// Search API
export const searchApi = {
  async search(
    query: string,
    options?: { count?: number; offset?: number; safesearch?: string }
  ): Promise<BraveSearchResponse> {
    const response = await fetchWithRetry(`${API_BASE}/proxy/brave/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, ...options }),
    });
    if (!response.ok) throw new Error('Failed to search');
    return response.json();
  },
};

// Health check
export const healthApi = {
  async check(): Promise<{ status: string; timestamp: string }> {
    const response = await fetchWithRetry(`${API_BASE}/health`);
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  },
};
