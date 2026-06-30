-- CreateEnum
CREATE TYPE "SearchProvider" AS ENUM ('GDELT', 'NEWS_API', 'BRAVE_SEARCH', 'SERP_API', 'CUSTOM');

-- CreateTable
CREATE TABLE "SearchProviderConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" "SearchProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT,
    "baseUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchProviderConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebNewsQuery" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "language" TEXT,
    "country" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checkIntervalMinutes" INTEGER NOT NULL DEFAULT 30,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebNewsQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchProviderConnection_organizationId_idx" ON "SearchProviderConnection"("organizationId");

-- CreateIndex
CREATE INDEX "SearchProviderConnection_organizationId_active_idx" ON "SearchProviderConnection"("organizationId", "active");

-- CreateIndex
CREATE INDEX "WebNewsQuery_organizationId_idx" ON "WebNewsQuery"("organizationId");

-- CreateIndex
CREATE INDEX "WebNewsQuery_organizationId_active_idx" ON "WebNewsQuery"("organizationId", "active");

-- AddForeignKey
ALTER TABLE "SearchProviderConnection" ADD CONSTRAINT "SearchProviderConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebNewsQuery" ADD CONSTRAINT "WebNewsQuery_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
