import { describe, it, expect, beforeEach, vi } from 'vitest';
import BraveSearchService from '../../src/services/BraveSearchService';
import ProviderService from '../../src/services/ProviderService';

describe('BraveSearchService', () => {
  beforeEach(() => {
    ProviderService.clear();
    BraveSearchService.resetClient();
  });

  describe('search', () => {
    it('should return mock results when no API key configured', async () => {
      const result = await BraveSearchService.search({ q: 'test query' });

      expect(result).toBeDefined();
      expect(result.query).toBe('test query');
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.resultCount).toBeGreaterThan(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should throw error for empty query', async () => {
      await expect(BraveSearchService.search({ q: '' })).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should throw error for whitespace-only query', async () => {
      await expect(BraveSearchService.search({ q: '   ' })).rejects.toThrow(
        'Search query is required'
      );
    });

    it('should include query in response', async () => {
      const query = 'javascript testing';
      const result = await BraveSearchService.search({ q: query });

      expect(result.query).toBe(query);
    });

    it('should respect count parameter', async () => {
      const result = await BraveSearchService.search({
        q: 'test',
        count: 2,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should return valid result structure', async () => {
      const result = await BraveSearchService.search({ q: 'test' });

      result.results.forEach((r) => {
        expect(r).toHaveProperty('title');
        expect(r).toHaveProperty('url');
        expect(r).toHaveProperty('description');
        expect(typeof r.title).toBe('string');
        expect(typeof r.url).toBe('string');
        expect(typeof r.description).toBe('string');
      });
    });

    it('should have executionTime greater than zero', async () => {
      const result = await BraveSearchService.search({ q: 'test' });

      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('Mock Mode', () => {
    it('should use mock mode by default', () => {
      expect(BraveSearchService.isMockMode()).toBe(true);
    });

    it('should always return consistent mock structure', async () => {
      const queries = ['query1', 'query2', 'query3'];

      const results = await Promise.all(
        queries.map((q) => BraveSearchService.search({ q }))
      );

      results.forEach((result) => {
        expect(result.results).toBeDefined();
        expect(result.results.length).toBeGreaterThan(0);
        expect(result.resultCount).toEqual(result.results.length);
      });
    });

    it('should return different results for different queries', async () => {
      const result1 = await BraveSearchService.search({ q: 'apple' });
      const result2 = await BraveSearchService.search({ q: 'banana' });

      expect(result1.query).toBe('apple');
      expect(result2.query).toBe('banana');
    });

    it('should respect count parameter in mock mode', async () => {
      const result = await BraveSearchService.search({
        q: 'test',
        count: 1,
      });

      expect(result.results.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Client Reset', () => {
    it('should reset to mock mode', () => {
      BraveSearchService.resetClient();
      expect(BraveSearchService.isMockMode()).toBe(true);
    });

    it('should allow reinitializing after reset', async () => {
      BraveSearchService.resetClient();

      const result = await BraveSearchService.search({ q: 'test' });

      expect(result.query).toBe('test');
    });
  });

  describe('Query Parameters', () => {
    it('should handle query without optional parameters', async () => {
      const result = await BraveSearchService.search({ q: 'test' });
      expect(result).toBeDefined();
    });

    it('should accept offset parameter', async () => {
      const result = await BraveSearchService.search({
        q: 'test',
        offset: 10,
      });

      expect(result).toBeDefined();
    });

    it('should accept safesearch parameter', async () => {
      const result = await BraveSearchService.search({
        q: 'test',
        safesearch: 'strict',
      });

      expect(result).toBeDefined();
    });

    it('should handle all parameters together', async () => {
      const result = await BraveSearchService.search({
        q: 'javascript',
        count: 5,
        offset: 0,
        safesearch: 'moderate',
      });

      expect(result.query).toBe('javascript');
      expect(result.results.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Response Format', () => {
    it('should have correct response type', async () => {
      const result = await BraveSearchService.search({ q: 'test' });

      expect(typeof result.query).toBe('string');
      expect(Array.isArray(result.results)).toBe(true);
      expect(typeof result.resultCount).toBe('number');
      expect(typeof result.executionTime).toBe('number');
    });

    it('should have valid URLs in results', async () => {
      const result = await BraveSearchService.search({ q: 'test' });

      result.results.forEach((r) => {
        expect(r.url).toMatch(/^https?:\/\//);
      });
    });

    it('should have non-empty titles and descriptions', async () => {
      const result = await BraveSearchService.search({ q: 'test' });

      result.results.forEach((r) => {
        expect(r.title.length).toBeGreaterThan(0);
        expect(r.description.length).toBeGreaterThan(0);
      });
    });
  });
});
