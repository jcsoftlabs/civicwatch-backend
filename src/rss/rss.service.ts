import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AlertStatus,
  AlertType,
  Keyword,
  Platform,
  Priority,
  Prisma,
  RssSource,
  Sentiment,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRssSourceDto } from './dto/create-rss-source.dto';
import { UpdateRssSourceDto } from './dto/update-rss-source.dto';
import { ParsedRssItem, RssParserService } from './rss-parser.service';

export interface RssCheckSummary {
  sourceId: string;
  checkedAt: string;
  createdMentions: number;
  createdAlerts: number;
  skippedDuplicates: number;
  matchedItems: number;
  errors: string[];
}

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);
  private readonly processingSourceIds = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly parserService: RssParserService,
    private readonly keywordMatcherService: KeywordMatcherService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.rssSource.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateRssSourceDto) {
    const rssSource = await this.prisma.rssSource.create({
      data: {
        organizationId,
        name: dto.name,
        feedUrl: dto.feedUrl,
        websiteUrl: dto.websiteUrl,
        active: dto.active ?? true,
        checkIntervalMinutes: dto.checkIntervalMinutes ?? 15,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'rss_source.created',
      entityType: 'RssSource',
      entityId: rssSource.id,
      metadata: dto,
    });

    return rssSource;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateRssSourceDto,
  ) {
    await this.findOne(organizationId, id);

    const rssSource = await this.prisma.rssSource.update({
      where: { id },
      data: dto,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'rss_source.updated',
      entityType: 'RssSource',
      entityId: id,
      metadata: dto,
    });

    return rssSource;
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);

    await this.prisma.rssSource.delete({
      where: { id },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'rss_source.deleted',
      entityType: 'RssSource',
      entityId: id,
    });

    return { success: true };
  }

  async checkNow(organizationId: string, id: string, userId?: string) {
    const rssSource = await this.findOne(organizationId, id);
    const summary = await this.processSource(rssSource);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'rss_source.checked_now',
      entityType: 'RssSource',
      entityId: id,
      metadata: summary,
    });

    return summary;
  }

  async processDueSources() {
    const sources = await this.prisma.rssSource.findMany({
      where: { active: true },
      orderBy: { updatedAt: 'asc' },
    });

    const dueSources = sources.filter((source) => this.isDue(source));
    for (const source of dueSources) {
      await this.processSource(source);
    }
  }

  private async findOne(organizationId: string, id: string) {
    const rssSource = await this.prisma.rssSource.findFirst({
      where: { organizationId, id },
    });

    if (!rssSource) {
      throw new NotFoundException('Source RSS introuvable.');
    }

    return rssSource;
  }

  private isDue(source: RssSource) {
    if (!source.lastCheckedAt) {
      return true;
    }

    const elapsedMs = Date.now() - source.lastCheckedAt.getTime();
    return elapsedMs >= source.checkIntervalMinutes * 60 * 1000;
  }

  private async processSource(source: RssSource): Promise<RssCheckSummary> {
    if (this.processingSourceIds.has(source.id)) {
      return {
        sourceId: source.id,
        checkedAt: new Date().toISOString(),
        createdMentions: 0,
        createdAlerts: 0,
        skippedDuplicates: 0,
        matchedItems: 0,
        errors: ['Source deja en cours de traitement.'],
      };
    }

    this.processingSourceIds.add(source.id);

    const summary: RssCheckSummary = {
      sourceId: source.id,
      checkedAt: new Date().toISOString(),
      createdMentions: 0,
      createdAlerts: 0,
      skippedDuplicates: 0,
      matchedItems: 0,
      errors: [],
    };

    try {
      const [items, keywords] = await Promise.all([
        this.parserService.parse(source.feedUrl),
        this.prisma.keyword.findMany({
          where: {
            organizationId: source.organizationId,
            active: true,
          },
        }),
      ]);

      const rssKeywords = keywords.filter((keyword) => this.supportsRss(keyword));

      for (const item of items) {
        const combinedContent = this.combineItemText(item);
        if (!combinedContent) {
          continue;
        }

        const match = this.keywordMatcherService.match(combinedContent, rssKeywords, Platform.RSS, {
          requireIdentityAnchor: true,
        });
        if (!match) {
          continue;
        }

        summary.matchedItems += 1;

        const duplicate = await this.findDuplicateMention(source.organizationId, item);
        if (duplicate) {
          summary.skippedDuplicates += 1;
          continue;
        }

        const mention = await this.prisma.mention.create({
          data: {
            organizationId: source.organizationId,
            monitoredProfileId: match.monitoredProfileId,
            platform: Platform.RSS,
            sourceName: source.name,
            externalId: item.externalId,
            title: item.title ?? null,
            content: item.excerpt ?? item.content ?? combinedContent.slice(0, 4000),
            url: item.url ?? null,
            matchedKeywords: match.matchedKeywords,
            sentiment: Sentiment.UNKNOWN,
            priority: match.highestPriority,
            detectedAt: new Date(),
            publishedAt: item.publishedAt,
            rawJson: item.raw as Prisma.InputJsonValue,
          },
        });

        summary.createdMentions += 1;

        await this.auditLogsService.log({
          organizationId: source.organizationId,
          action: 'rss_mention.created',
          entityType: 'Mention',
          entityId: mention.id,
          metadata: {
            rssSourceId: source.id,
            matchedKeywords: match.matchedKeywords,
            feedUrl: source.feedUrl,
          },
        });

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
              title: `Alerte RSS ${match.highestPriority}`,
              message: `Nouvel article detecte dans ${source.name} avec les mots-cles: ${match.matchedKeywords.join(', ')}`,
              status: AlertStatus.PENDING,
            },
          });

          summary.createdAlerts += 1;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur RSS inconnue.';
      summary.errors.push(message);
      this.logger.error(`RSS check failed for source ${source.id}: ${message}`, error);
    } finally {
      await this.prisma.rssSource.update({
        where: { id: source.id },
        data: { lastCheckedAt: new Date() },
      });
      this.processingSourceIds.delete(source.id);
    }

    return summary;
  }

  private supportsRss(keyword: Keyword) {
    return Array.isArray(keyword.platforms)
      ? (keyword.platforms as string[]).includes(Platform.RSS)
      : false;
  }

  private combineItemText(item: ParsedRssItem) {
    return [item.title, item.excerpt, item.content].filter(Boolean).join(' ').trim();
  }

  private async findDuplicateMention(organizationId: string, item: ParsedRssItem) {
    if (!item.externalId && !item.url) {
      return null;
    }

    return this.prisma.mention.findFirst({
      where: {
        organizationId,
        platform: Platform.RSS,
        OR: [
          ...(item.externalId ? [{ externalId: item.externalId }] : []),
          ...(item.url ? [{ url: item.url }] : []),
        ],
      },
      select: { id: true },
    });
  }
}
