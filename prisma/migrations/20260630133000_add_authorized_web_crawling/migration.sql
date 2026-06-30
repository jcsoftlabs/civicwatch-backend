-- CreateTable
CREATE TABLE "CrawlSource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "startUrls" JSONB NOT NULL,
    "allowedDomains" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "respectRobotsTxt" BOOLEAN NOT NULL DEFAULT true,
    "checkIntervalMinutes" INTEGER NOT NULL DEFAULT 60,
    "maxPagesPerRun" INTEGER NOT NULL DEFAULT 20,
    "lastCrawledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawlSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrawledPage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "crawlSourceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "contentHash" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "lastChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CrawledPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlSource_organizationId_idx" ON "CrawlSource"("organizationId");

-- CreateIndex
CREATE INDEX "CrawlSource_organizationId_active_idx" ON "CrawlSource"("organizationId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "CrawledPage_crawlSourceId_url_key" ON "CrawledPage"("crawlSourceId", "url");

-- CreateIndex
CREATE INDEX "CrawledPage_organizationId_idx" ON "CrawledPage"("organizationId");

-- CreateIndex
CREATE INDEX "CrawledPage_crawlSourceId_lastSeenAt_idx" ON "CrawledPage"("crawlSourceId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "CrawlSource" ADD CONSTRAINT "CrawlSource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrawledPage" ADD CONSTRAINT "CrawledPage_crawlSourceId_fkey" FOREIGN KEY ("crawlSourceId") REFERENCES "CrawlSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
