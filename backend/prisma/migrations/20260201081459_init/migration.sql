-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "providers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "apiKey" TEXT,
    "baseUrl" TEXT,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "timeout" INTEGER NOT NULL DEFAULT 30000,
    "isConfigured" BOOLEAN NOT NULL DEFAULT false,
    "lastChecked" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageStats" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "totalLatency" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "apiKeyId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "statusCode" INTEGER,
    "latency" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_name_key" ON "ApiKey"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_key_key" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_key_idx" ON "ApiKey"("key");

-- CreateIndex
CREATE INDEX "ApiKey_isActive_idx" ON "ApiKey"("isActive");

-- CreateIndex
CREATE INDEX "ApiKey_expiresAt_idx" ON "ApiKey"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_name_key" ON "ProviderConfig"("name");

-- CreateIndex
CREATE INDEX "ProviderConfig_name_idx" ON "ProviderConfig"("name");

-- CreateIndex
CREATE INDEX "ProviderConfig_isConfigured_idx" ON "ProviderConfig"("isConfigured");

-- CreateIndex
CREATE INDEX "UsageStats_apiKeyId_idx" ON "UsageStats"("apiKeyId");

-- CreateIndex
CREATE INDEX "UsageStats_providerId_idx" ON "UsageStats"("providerId");

-- CreateIndex
CREATE INDEX "UsageStats_lastUsedAt_idx" ON "UsageStats"("lastUsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UsageStats_apiKeyId_providerId_key" ON "UsageStats"("apiKeyId", "providerId");

-- CreateIndex
CREATE INDEX "ApiLog_apiKeyId_idx" ON "ApiLog"("apiKeyId");

-- CreateIndex
CREATE INDEX "ApiLog_providerId_idx" ON "ApiLog"("providerId");

-- CreateIndex
CREATE INDEX "ApiLog_createdAt_idx" ON "ApiLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_statusCode_idx" ON "ApiLog"("statusCode");

-- AddForeignKey
ALTER TABLE "UsageStats" ADD CONSTRAINT "UsageStats_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageStats" ADD CONSTRAINT "UsageStats_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_apiKeyId_fkey" FOREIGN KEY ("apiKeyId") REFERENCES "ApiKey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ProviderConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;
