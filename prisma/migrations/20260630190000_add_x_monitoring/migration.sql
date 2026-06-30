-- CreateEnum
CREATE TYPE "ApiConnectionPlatform" AS ENUM ('X', 'META', 'INSTAGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ApiConnectionStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');

-- CreateTable
CREATE TABLE "ApiConnection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" "ApiConnectionPlatform" NOT NULL,
    "label" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "bearerTokenEncrypted" TEXT,
    "apiKeyEncrypted" TEXT,
    "apiSecretEncrypted" TEXT,
    "status" "ApiConnectionStatus" NOT NULL DEFAULT 'DISABLED',
    "config" JSONB,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XSearchRule" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checkIntervalMinutes" INTEGER NOT NULL DEFAULT 5,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XSearchRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiConnection_organizationId_idx" ON "ApiConnection"("organizationId");

-- CreateIndex
CREATE INDEX "ApiConnection_organizationId_platform_status_idx" ON "ApiConnection"("organizationId", "platform", "status");

-- CreateIndex
CREATE INDEX "XSearchRule_organizationId_idx" ON "XSearchRule"("organizationId");

-- CreateIndex
CREATE INDEX "XSearchRule_organizationId_active_idx" ON "XSearchRule"("organizationId", "active");

-- AddForeignKey
ALTER TABLE "ApiConnection" ADD CONSTRAINT "ApiConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XSearchRule" ADD CONSTRAINT "XSearchRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
