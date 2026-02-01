import { Request, Response } from 'express';
import PrismaService from '../services/PrismaService';

export class StatsController {
  /**
   * GET /api/stats - Get aggregated usage statistics
   */
  static async getStats(_req: Request, res: Response): Promise<void> {
    try {
      const usageStats = await PrismaService.getUsageStats();
      
      // Aggregate stats by provider
      const byProvider: { [key: string]: any } = {};
      const byKey: { [key: string]: any } = {};

      for (const stat of usageStats) {
        const providerName = stat.provider.name;
        const keyName = stat.apiKey.name;

        // Group by provider
        if (!byProvider[providerName]) {
          byProvider[providerName] = {
            provider: providerName,
            totalRequests: 0,
            totalSuccess: 0,
            totalErrors: 0,
            avgLatency: 0,
            keys: [],
          };
        }

        byProvider[providerName].totalRequests += stat.requestCount;
        byProvider[providerName].totalSuccess += stat.successCount;
        byProvider[providerName].totalErrors += stat.errorCount;
        byProvider[providerName].keys.push({
          keyName,
          requests: stat.requestCount,
          success: stat.successCount,
          errors: stat.errorCount,
          avgLatency: stat.requestCount > 0 ? Math.round(stat.totalLatency / stat.requestCount) : 0,
          lastUsedAt: stat.lastUsedAt.toISOString(),
        });

        // Group by key
        if (!byKey[keyName]) {
          byKey[keyName] = {
            keyName,
            totalRequests: 0,
            totalSuccess: 0,
            totalErrors: 0,
            avgLatency: 0,
            providers: [],
          };
        }

        byKey[keyName].totalRequests += stat.requestCount;
        byKey[keyName].totalSuccess += stat.successCount;
        byKey[keyName].totalErrors += stat.errorCount;
        byKey[keyName].providers.push({
          provider: providerName,
          requests: stat.requestCount,
          success: stat.successCount,
          errors: stat.errorCount,
          avgLatency: stat.requestCount > 0 ? Math.round(stat.totalLatency / stat.requestCount) : 0,
        });
      }

      // Calculate averages
      for (const provider of Object.values(byProvider) as any[]) {
        if (provider.totalRequests > 0) {
          provider.avgLatency = Math.round(
            provider.keys.reduce((sum: number, k: any) => sum + k.avgLatency, 0) / provider.keys.length
          );
        }
      }

      for (const key of Object.values(byKey) as any[]) {
        if (key.totalRequests > 0) {
          key.avgLatency = Math.round(
            key.providers.reduce((sum: number, p: any) => sum + p.avgLatency, 0) / key.providers.length
          );
        }
      }

      res.json({
        timestamp: new Date().toISOString(),
        summary: {
          totalRequests: usageStats.reduce((sum, s) => sum + s.requestCount, 0),
          totalSuccess: usageStats.reduce((sum, s) => sum + s.successCount, 0),
          totalErrors: usageStats.reduce((sum, s) => sum + s.errorCount, 0),
          totalKeys: new Set(usageStats.map(s => s.apiKeyId)).size,
          totalProviders: new Set(usageStats.map(s => s.providerId)).size,
        },
        byProvider,
        byKey,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  }

  /**
   * GET /api/stats/keys - Get stats for a specific key
   */
  static async getKeyStats(req: Request, res: Response): Promise<void> {
    try {
      const { keyId } = req.params;
      const stats = await PrismaService.getUsageStats(keyId);

      if (!stats || stats.length === 0) {
        res.json({
          keyId,
          totalRequests: 0,
          totalSuccess: 0,
          totalErrors: 0,
          providers: [],
        });
        return;
      }

      const summary = {
        keyId,
        totalRequests: stats.reduce((sum, s) => sum + s.requestCount, 0),
        totalSuccess: stats.reduce((sum, s) => sum + s.successCount, 0),
        totalErrors: stats.reduce((sum, s) => sum + s.errorCount, 0),
        providers: stats.map(s => ({
          provider: s.provider.name,
          requests: s.requestCount,
          success: s.successCount,
          errors: s.errorCount,
          avgLatency: s.requestCount > 0 ? Math.round(s.totalLatency / s.requestCount) : 0,
          lastUsedAt: s.lastUsedAt.toISOString(),
        })),
      };

      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch key statistics' });
    }
  }
}
