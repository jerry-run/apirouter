import { PrismaClient } from '@prisma/client';
import { v4 as uuid } from 'uuid';

export interface CreateKeyRequest {
  name: string;
  providers: string[];
  expiresIn?: 'never' | '90days' | '180days';
}

export interface UpdateProviderRequest {
  apiKey?: string;
  baseUrl?: string;
  rateLimit?: number;
  timeout?: number;
}

/**
 * Prisma Database Service
 * Unified data access layer for all database operations
 */
class PrismaService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ==================== API KEYS ====================

  async createKey(request: CreateKeyRequest) {
    const expiresIn = request.expiresIn || '90days';
    let expiresAt: Date | null = null;

    if (expiresIn === '90days') {
      expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    } else if (expiresIn === '180days') {
      expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    }

    return this.prisma.apiKey.create({
      data: {
        name: request.name,
        key: this.generateSecureKey(),
        providers: request.providers,
        expiresAt,
      },
    });
  }

  async getKey(id: string) {
    return this.prisma.apiKey.findUnique({
      where: { id },
      include: {
        usageStats: {
          include: {
            provider: true,
          },
        },
      },
    });
  }

  async getKeyByString(keyString: string) {
    return this.prisma.apiKey.findUnique({
      where: { key: keyString },
    });
  }

  async listKeys() {
    return this.prisma.apiKey.findMany({
      where: { isActive: true },
      include: {
        usageStats: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteKey(id: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id } });
    if (!key) return false;

    await this.prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });
    return true;
  }

  async verifyKey(keyString: string, provider: string): Promise<boolean> {
    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key: keyString },
    });

    if (!apiKey || !apiKey.isActive) return false;
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return false;
    return apiKey.providers.includes(provider);
  }

  async recordKeyUsage(keyString: string) {
    await this.prisma.apiKey.update({
      where: { key: keyString },
      data: { lastUsedAt: new Date() },
    });
  }

  // ==================== PROVIDERS ====================

  async initializeProvider(name: string, data?: UpdateProviderRequest) {
    return this.prisma.providerConfig.create({
      data: {
        name: name.toLowerCase(),
        apiKey: data?.apiKey,
        baseUrl: data?.baseUrl,
        rateLimit: data?.rateLimit || 100,
        timeout: data?.timeout || 30000,
        isConfigured: !!data?.apiKey,
      },
    });
  }

  async getProvider(name: string) {
    return this.prisma.providerConfig.findUnique({
      where: { name: name.toLowerCase() },
    });
  }

  async listProviders() {
    return this.prisma.providerConfig.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async updateProvider(name: string, data: UpdateProviderRequest) {
    const normalized = name.toLowerCase();
    let provider = await this.prisma.providerConfig.findUnique({
      where: { name: normalized },
    });

    if (!provider) {
      // Create if doesn't exist
      provider = await this.initializeProvider(name, data);
    } else {
      // Update existing
      provider = await this.prisma.providerConfig.update({
        where: { name: normalized },
        data: {
          apiKey: data.apiKey ?? provider.apiKey,
          baseUrl: data.baseUrl ?? provider.baseUrl,
          rateLimit: data.rateLimit ?? provider.rateLimit,
          timeout: data.timeout ?? provider.timeout,
          isConfigured: !!(data.apiKey ?? provider.apiKey),
          lastChecked: new Date(),
        },
      });
    }

    return provider;
  }

  async checkProvider(name: string) {
    const provider = await this.prisma.providerConfig.findUnique({
      where: { name: name.toLowerCase() },
    });

    if (!provider) throw new Error(`Provider ${name} not found`);

    // Update last checked
    await this.prisma.providerConfig.update({
      where: { name: name.toLowerCase() },
      data: { lastChecked: new Date() },
    });

    return provider.isConfigured;
  }

  async deleteProvider(name: string) {
    return this.prisma.providerConfig.delete({
      where: { name: name.toLowerCase() },
    });
  }

  // ==================== USAGE STATS ====================

  async recordUsage(
    apiKeyId: string,
    providerId: string,
    success: boolean,
    latency: number
  ) {
    // Update or create usage stat
    const existing = await this.prisma.usageStats.findUnique({
      where: {
        apiKeyId_providerId: {
          apiKeyId,
          providerId,
        },
      },
    });

    if (existing) {
      return this.prisma.usageStats.update({
        where: {
          apiKeyId_providerId: {
            apiKeyId,
            providerId,
          },
        },
        data: {
          requestCount: { increment: 1 },
          successCount: success ? { increment: 1 } : undefined,
          errorCount: !success ? { increment: 1 } : undefined,
          totalLatency: { increment: latency },
          lastUsedAt: new Date(),
        },
      });
    } else {
      return this.prisma.usageStats.create({
        data: {
          apiKeyId,
          providerId,
          requestCount: 1,
          successCount: success ? 1 : 0,
          errorCount: !success ? 1 : 0,
          totalLatency: latency,
        },
      });
    }
  }

  async getUsageStats(apiKeyId?: string) {
    const where = apiKeyId ? { apiKeyId } : {};
    return this.prisma.usageStats.findMany({
      where,
      include: {
        apiKey: true,
        provider: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  // ==================== API LOGS ====================

  async logApiCall(
    apiKeyId: string,
    providerId: string,
    endpoint: string,
    method: string,
    statusCode: number | null,
    latency: number,
    errorMessage?: string
  ) {
    return this.prisma.apiLog.create({
      data: {
        apiKeyId,
        providerId,
        endpoint,
        method,
        statusCode,
        latency,
        errorMessage,
      },
    });
  }

  async getApiLogs(apiKeyId?: string, limit = 100) {
    const where = apiKeyId ? { apiKeyId } : {};
    return this.prisma.apiLog.findMany({
      where,
      include: {
        apiKey: true,
        provider: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ==================== CLEANUP ====================

  /**
   * Clean up expired keys
   */
  async cleanupExpiredKeys() {
    const result = await this.prisma.apiKey.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });
    return result.count;
  }

  /**
   * Clean up old API logs (older than 30 days)
   */
  async cleanupOldLogs(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const result = await this.prisma.apiLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
    return result.count;
  }

  // ==================== UTILITIES ====================

  private generateSecureKey(): string {
    return `ar_${uuid().replace(/-/g, '')}`.substring(0, 32);
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default new PrismaService();
