import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AlertStatus,
  AlertType,
  CrawlSource,
  Platform,
  Prisma,
  Priority,
  Sentiment,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCrawlSourceDto } from './dto/create-crawl-source.dto';
import { UpdateCrawlSourceDto } from './dto/update-crawl-source.dto';
import { CrawlNormalizerService } from './crawl-normalizer.service';
import { HtmlExtractorService } from './html-extractor.service';
import { RobotsTxtService } from './robots-txt.service';

export interface CrawlRunSummary {
  sourceId: string;
  checkedAt: string;
  pagesVisited: number;
  pagesSkipped: number;
  pagesUpdated: number;
  mentionsCreated: number;
  alertsCreated: number;
  errors: string[];
}

@Injectable()
export class WebCrawlerService {
  private readonly logger = new Logger(WebCrawlerService.name);
  private readonly runningSources = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly keywordMatcherService: KeywordMatcherService,
    private readonly robotsTxtService: RobotsTxtService,
    private readonly htmlExtractorService: HtmlExtractorService,
    private readonly crawlNormalizerService: CrawlNormalizerService,
    private readonly configService: ConfigService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.crawlSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(organizationId: string, id: string) {
    const source = await this.prisma.crawlSource.findFirst({
      where: { organizationId, id },
      include: {
        crawledPages: {
          orderBy: { lastSeenAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!source) {
      throw new NotFoundException('Source de crawl introuvable.');
    }

    return source;
  }

  async create(organizationId: string, userId: string, dto: CreateCrawlSourceDto) {
    const source = await this.prisma.crawlSource.create({
      data: {
        organizationId,
        name: dto.name,
        baseUrl: dto.baseUrl,
        startUrls: dto.startUrls,
        allowedDomains: dto.allowedDomains,
        active: dto.active ?? true,
        respectRobotsTxt: dto.respectRobotsTxt ?? true,
        checkIntervalMinutes: dto.checkIntervalMinutes ?? 60,
        maxPagesPerRun:
          dto.maxPagesPerRun ??
          this.configService.get<number>('CRAWLER_MAX_PAGES_PER_RUN', 20),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'crawl_source.created',
      entityType: 'CrawlSource',
      entityId: source.id,
      metadata: dto,
    });

    return source;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateCrawlSourceDto,
  ) {
    await this.requireSource(organizationId, id);

    const source = await this.prisma.crawlSource.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.startUrls ? { startUrls: dto.startUrls } : {}),
        ...(dto.allowedDomains ? { allowedDomains: dto.allowedDomains } : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'crawl_source.updated',
      entityType: 'CrawlSource',
      entityId: id,
      metadata: dto,
    });

    return source;
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.requireSource(organizationId, id);
    await this.prisma.crawlSource.delete({ where: { id } });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'crawl_source.deleted',
      entityType: 'CrawlSource',
      entityId: id,
    });

    return { success: true };
  }

  async checkNow(organizationId: string, id: string, userId?: string) {
    const source = await this.requireSource(organizationId, id);
    const summary = await this.processSource(source, true);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'crawl_source.checked_now',
      entityType: 'CrawlSource',
      entityId: id,
      metadata: summary,
    });

    return summary;
  }

  async processDueSources() {
    const sources = await this.prisma.crawlSource.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'asc' },
    });

    for (const source of sources) {
      if (this.isDue(source)) {
        await this.processSource(source, false);
      }
    }
  }

  private async requireSource(organizationId: string, id: string) {
    const source = await this.prisma.crawlSource.findFirst({
      where: { organizationId, id },
    });

    if (!source) {
      throw new NotFoundException('Source de crawl introuvable.');
    }

    return source;
  }

  private isDue(source: CrawlSource) {
    if (!source.lastCrawledAt) {
      return true;
    }

    return (
      Date.now() - source.lastCrawledAt.getTime() >=
      source.checkIntervalMinutes * 60 * 1000
    );
  }

  private async processSource(source: CrawlSource, manual: boolean): Promise<CrawlRunSummary> {
    if (this.runningSources.has(source.id)) {
      return {
        sourceId: source.id,
        checkedAt: new Date().toISOString(),
        pagesVisited: 0,
        pagesSkipped: 0,
        pagesUpdated: 0,
        mentionsCreated: 0,
        alertsCreated: 0,
        errors: ['Source deja en cours de crawl.'],
      };
    }

    if (!source.active && !manual) {
      return {
        sourceId: source.id,
        checkedAt: new Date().toISOString(),
        pagesVisited: 0,
        pagesSkipped: 0,
        pagesUpdated: 0,
        mentionsCreated: 0,
        alertsCreated: 0,
        errors: ['Source inactive.'],
      };
    }

    this.runningSources.add(source.id);

    const summary: CrawlRunSummary = {
      sourceId: source.id,
      checkedAt: new Date().toISOString(),
      pagesVisited: 0,
      pagesSkipped: 0,
      pagesUpdated: 0,
      mentionsCreated: 0,
      alertsCreated: 0,
      errors: [],
    };

    const userAgent = this.configService.get<string>(
      'CRAWLER_USER_AGENT',
      'CivicWatchBot/1.0 (+contact configured by organization)',
    );
    const timeoutMs = this.configService.get<number>('CRAWLER_DEFAULT_TIMEOUT_MS', 10000);
    const allowedDomains = this.toStringArray(source.allowedDomains);
    const queue = [...this.toStringArray(source.startUrls)];
    const seenUrls = new Set<string>();
    const keywordsPromise = this.prisma.keyword.findMany({
      where: {
        organizationId: source.organizationId,
        active: true,
      },
    });

    try {
      const keywords = await keywordsPromise;

      while (queue.length > 0 && summary.pagesVisited < source.maxPagesPerRun) {
        const currentUrl = queue.shift();
        if (!currentUrl) {
          continue;
        }

        if (seenUrls.has(currentUrl)) {
          continue;
        }
        seenUrls.add(currentUrl);

        if (!this.isAllowedUrl(currentUrl, allowedDomains)) {
          summary.pagesSkipped += 1;
          continue;
        }

        if (source.respectRobotsTxt) {
          const allowed = await this.robotsTxtService.isAllowed(currentUrl, userAgent);
          if (!allowed) {
            summary.pagesSkipped += 1;
            this.logger.warn(`robots.txt denied crawl for ${currentUrl}`);
            continue;
          }
        }

        const html = await this.fetchHtml(currentUrl, userAgent, timeoutMs, summary);
        if (!html) {
          summary.pagesSkipped += 1;
          continue;
        }

        summary.pagesVisited += 1;

        const extracted = this.htmlExtractorService.extract(html, currentUrl, allowedDomains);
        const contentToHash = `${extracted.title ?? ''}\n${extracted.metaDescription ?? ''}\n${extracted.textContent}`;
        const contentHash = this.crawlNormalizerService.hashContent(contentToHash);
        const existingPage = await this.prisma.crawledPage.findUnique({
          where: {
            crawlSourceId_url: {
              crawlSourceId: source.id,
              url: currentUrl,
            },
          },
        });

        for (const link of extracted.internalLinks) {
          if (
            !seenUrls.has(link) &&
            queue.length + seenUrls.size < source.maxPagesPerRun * 4 &&
            this.isAllowedUrl(link, allowedDomains)
          ) {
            queue.push(link);
          }
        }

        if (existingPage && existingPage.contentHash === contentHash) {
          await this.prisma.crawledPage.update({
            where: { id: existingPage.id },
            data: {
              title: extracted.title,
              lastSeenAt: new Date(),
            },
          });
          continue;
        }

        const contentChangedAt = existingPage ? new Date() : undefined;
        const crawledPage = existingPage
          ? await this.prisma.crawledPage.update({
              where: { id: existingPage.id },
              data: {
                title: extracted.title,
                contentHash,
                lastSeenAt: new Date(),
                lastChangedAt: contentChangedAt,
              },
            })
          : await this.prisma.crawledPage.create({
              data: {
                organizationId: source.organizationId,
                crawlSourceId: source.id,
                url: currentUrl,
                title: extracted.title,
                contentHash,
                lastSeenAt: new Date(),
                lastChangedAt: new Date(),
              },
            });

        void crawledPage;
        summary.pagesUpdated += 1;

        const match = this.keywordMatcherService.match(
          `${extracted.title ?? ''} ${extracted.metaDescription ?? ''} ${extracted.textContent}`,
          keywords,
          Platform.CRAWLER,
        );

        if (!match) {
          continue;
        }

        const excerpt = this.crawlNormalizerService.buildExcerpt(
          extracted.textContent || extracted.metaDescription || extracted.title || '',
          match.matchedKeywords,
        );

        const mention = await this.prisma.mention.create({
          data: {
            organizationId: source.organizationId,
            monitoredProfileId: match.monitoredProfileId,
            platform: Platform.CRAWLER,
            sourceName: source.name,
            externalId: currentUrl,
            title: extracted.title ?? null,
            content: excerpt,
            url: currentUrl,
            matchedKeywords: match.matchedKeywords,
            sentiment: Sentiment.UNKNOWN,
            priority: match.highestPriority,
            detectedAt: new Date(),
            rawJson: {
              crawlSourceId: source.id,
              baseUrl: source.baseUrl,
              url: currentUrl,
              metaDescription: extracted.metaDescription,
              contentHash,
              extractedLinks: extracted.internalLinks.slice(0, 20),
            } as Prisma.InputJsonValue,
          },
        });
        summary.mentionsCreated += 1;

        if (
          match.highestPriority === Priority.HIGH ||
          match.highestPriority === Priority.CRITICAL
        ) {
          await this.prisma.alert.create({
            data: {
              organizationId: source.organizationId,
              mentionId: mention.id,
              alertType: AlertType.IN_APP,
              severity: match.highestPriority,
              title: `Alerte Crawl ${match.highestPriority}`,
              message: `Contenu detecte sur ${source.name}: ${extracted.title ?? currentUrl}`,
              status: AlertStatus.PENDING,
            },
          });
          summary.alertsCreated += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur de crawl inconnue.';
      summary.errors.push(message);
      this.logger.error(`Crawl failed for source ${source.id}: ${message}`, error);
    } finally {
      await this.prisma.crawlSource.update({
        where: { id: source.id },
        data: { lastCrawledAt: new Date() },
      });
      this.runningSources.delete(source.id);
    }

    return summary;
  }

  private async fetchHtml(
    pageUrl: string,
    userAgent: string,
    timeoutMs: number,
    summary: CrawlRunSummary,
  ) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': userAgent,
          Accept: 'text/html,application/xhtml+xml',
        },
      });

      if (!response.ok) {
        summary.errors.push(`${pageUrl}: HTTP ${response.status}`);
        return null;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('text/html')) {
        summary.errors.push(`${pageUrl}: type ${contentType} non supporte`);
        return null;
      }

      return await response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur fetch inconnue.';
      summary.errors.push(`${pageUrl}: ${message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private isAllowedUrl(targetUrl: string, allowedDomains: string[]) {
    try {
      const url = new URL(targetUrl);
      return allowedDomains.some(
        (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );
    } catch {
      return false;
    }
  }

  private toStringArray(value: Prisma.JsonValue) {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }
}
