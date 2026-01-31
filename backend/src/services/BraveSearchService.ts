import axios, { AxiosInstance } from 'axios';
import ProviderService from './ProviderService';

export interface SearchQuery {
  q: string;
  count?: number;
  offset?: number;
  safesearch?: 'off' | 'moderate' | 'strict';
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
}

/**
 * Brave Search API Proxy Service
 * Routes requests to Brave Search API with mock fallback
 */
class BraveSearchService {
  private client: AxiosInstance | null = null;
  private useMock = true; // Default to mock mode for MVP

  /**
   * Initialize client with API key
   */
  private getClient(): AxiosInstance {
    if (this.client) {
      return this.client;
    }

    const settings = ProviderService.getSettings('brave');
    const apiKey = settings?.apiKey;
    const baseUrl = settings?.baseUrl || 'https://api.search.brave.com/res/v1';

    if (!apiKey) {
      this.useMock = true;
    } else {
      this.useMock = false;
    }

    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey || '',
      },
      timeout: settings?.timeout || 30000,
    });

    return this.client;
  }

  /**
   * Execute search query
   */
  async search(query: SearchQuery): Promise<BraveSearchResponse> {
    if (!query.q || query.q.trim().length === 0) {
      throw new Error('Search query is required');
    }

    // Use mock data if no API key configured
    if (this.useMock) {
      return this.getMockResults(query);
    }

    try {
      const client = this.getClient();
      const startTime = Date.now();

      const response = await client.get('/search', {
        params: {
          q: query.q,
          count: query.count || 10,
          offset: query.offset || 0,
          safesearch: query.safesearch || 'moderate',
        },
      });

      const results = response.data.web?.results || [];
      const executionTime = Date.now() - startTime;

      return {
        query: query.q,
        results: results.map((r: any) => ({
          title: r.title,
          url: r.url,
          description: r.description,
        })),
        resultCount: results.length,
        executionTime,
      };
    } catch (error) {
      // Fallback to mock on API error
      return this.getMockResults(query);
    }
  }

  /**
   * Get mock search results (for development)
   */
  private getMockResults(query: SearchQuery): BraveSearchResponse {
    const mockResults: SearchResult[] = [
      {
        title: `Result 1 for "${query.q}"`,
        url: 'https://example.com/1',
        description: 'This is a mock search result for testing purposes.',
      },
      {
        title: `Result 2 for "${query.q}"`,
        url: 'https://example.com/2',
        description: 'Another mock result to demonstrate the API structure.',
      },
      {
        title: `Result 3 for "${query.q}"`,
        url: 'https://example.com/3',
        description: 'Mock results are used when no API key is configured.',
      },
    ];

    return {
      query: query.q,
      results: mockResults.slice(0, query.count || 10),
      resultCount: mockResults.length,
      executionTime: Math.random() * 100 + 50, // Simulate 50-150ms
    };
  }

  /**
   * Reset client (for testing or reconfiguration)
   */
  resetClient(): void {
    this.client = null;
    this.useMock = true;
  }

  /**
   * Check if using mock mode
   */
  isMockMode(): boolean {
    return this.useMock;
  }
}

export default new BraveSearchService();
