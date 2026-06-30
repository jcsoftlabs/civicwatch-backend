import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AlertStatus,
  AlertType,
  Platform,
  Prisma,
  Priority,
  SearchProvider,
  SearchProviderConnection,
  Sentiment,
  WebNewsQuery,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EncryptionService } from '../common/services/encryption.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSearchProviderConnectionDto } from './dto/create-search-provider-connection.dto';
import { CreateWebNewsQueryDto } from './dto/create-web-news-query.dto';
import { UpdateSearchProviderConnectionDto } from './dto/update-search-provider-connection.dto';
import { UpdateWebNewsQueryDto } from './dto/update-web-news-query.dto';
import { BraveSearchProvider } from './providers/brave-search.provider';
import { GdeltProvider } from './providers/gdelt.provider';
import { NewsApiProvider } from './providers/news-api.provider';
import { SerpApiProvider } from './providers/serp-api.provider';
import { WebNewsProvider } from './providers/web-news-provider.interface';
import { NormalizedWebNewsResult } from './types/normalized-web-news-result.type';

export interface WebNewsCheckSummary {
  organizationId: string;
  checkedAt: string;
  queriesProcessed: number;
  providerCalls: number;
  createdMentions: number;
  createdAlerts: number;
  skippedDuplicates: number;
  matchedResults: number;
  errors: string[];
}

@Injectable()
export class WebNewsService {
  private readonly logger = new Logger(WebNewsService.name);
  private readonly runningOrganizations = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly keywordMatcherService: KeywordMatcherService,
    private readonly encryptionService: EncryptionService,
    gdeltProvider: GdeltProvider,
    newsApiProvider: NewsApiProvider,
    braveSearchProvider: BraveSearchProvider,
    serpApiProvider: SerpApiProvider,
  ) {
    this.providers = new Map<SearchProvider, WebNewsProvider>([
      [gdeltProvider.provider, gdeltProvider],
      [newsApiProvider.provider, newsApiProvider],
      [braveSearchProvider.provider, braveSearchProvider],
      [serpApiProvider.provider, serpApiProvider],
    ]);
  }

  private readonly providers: Map<SearchProvider, WebNewsProvider>;

  async findProviders(organizationId: string) {
    const providers = await this.prisma.searchProviderConnection.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    return providers.map((provider) => this.sanitizeProvider(provider));
  }

  async createProvider(
    organizationId: string,
    userId: string,
    dto: CreateSearchProviderConnectionDto,
  ) {
    const provider = await this.prisma.searchProviderConnection.create({
      data: {
        organizationId,
        provider: dto.provider,
        label: dto.label,
        apiKeyEncrypted: dto.apiKey ? this.encryptionService.encrypt(dto.apiKey) : undefined,
        baseUrl: dto.baseUrl,
        active: dto.active ?? true,
        config: dto.config as Prisma.InputJsonValue | undefined,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.provider_created',
      entityType: 'SearchProviderConnection',
      entityId: provider.id,
      metadata: { ...dto, apiKey: dto.apiKey ? '[REDACTED]' : undefined },
    });

    return this.sanitizeProvider(provider);
  }

  async updateProvider(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateSearchProviderConnectionDto,
  ) {
    const existing = await this.findProviderRecord(organizationId, id);

    const provider = await this.prisma.searchProviderConnection.update({
      where: { id: existing.id },
      data: {
        ...(dto.provider ? { provider: dto.provider } : {}),
        ...(dto.label ? { label: dto.label } : {}),
        ...(dto.baseUrl !== undefined ? { baseUrl: dto.baseUrl } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.config !== undefined
          ? { config: dto.config as Prisma.InputJsonValue | undefined }
          : {}),
        ...(dto.apiKey !== undefined
          ? {
              apiKeyEncrypted: dto.apiKey
                ? this.encryptionService.encrypt(dto.apiKey)
                : null,
            }
          : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.provider_updated',
      entityType: 'SearchProviderConnection',
      entityId: id,
      metadata: { ...dto, apiKey: dto.apiKey ? '[REDACTED]' : undefined },
    });

    return this.sanitizeProvider(provider);
  }

  async removeProvider(organizationId: string, id: string, userId: string) {
    const existing = await this.findProviderRecord(organizationId, id);
    await this.prisma.searchProviderConnection.delete({
      where: { id: existing.id },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.provider_deleted',
      entityType: 'SearchProviderConnection',
      entityId: id,
    });

    return { success: true };
  }

  findQueries(organizationId: string) {
    return this.prisma.webNewsQuery.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createQuery(organizationId: string, userId: string, dto: CreateWebNewsQueryDto) {
    const query = await this.prisma.webNewsQuery.create({
      data: {
        organizationId,
        name: dto.name,
        query: dto.query,
        language: dto.language,
        country: dto.country,
        active: dto.active ?? true,
        checkIntervalMinutes: dto.checkIntervalMinutes ?? 30,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.query_created',
      entityType: 'WebNewsQuery',
      entityId: query.id,
      metadata: dto,
    });

    return query;
  }

  async updateQuery(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateWebNewsQueryDto,
  ) {
    const existing = await this.findQueryRecord(organizationId, id);

    const query = await this.prisma.webNewsQuery.update({
      where: { id: existing.id },
      data: dto,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.query_updated',
      entityType: 'WebNewsQuery',
      entityId: id,
      metadata: dto,
    });

    return query;
  }

  async removeQuery(organizationId: string, id: string, userId: string) {
    const existing = await this.findQueryRecord(organizationId, id);
    await this.prisma.webNewsQuery.delete({
      where: { id: existing.id },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.query_deleted',
      entityType: 'WebNewsQuery',
      entityId: id,
    });

    return { success: true };
  }

  async checkNow(organizationId: string, userId?: string) {
    const summary = await this.runForOrganization(organizationId);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.check_now',
      entityType: 'Organization',
      entityId: organizationId,
      metadata: summary,
    });

    return summary;
  }

  async checkQueryNow(organizationId: string, queryId: string, userId?: string) {
    const query = await this.findQueryRecord(organizationId, queryId);
    const summary = await this.runForOrganization(organizationId, [query]);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'web_news.query_check_now',
      entityType: 'WebNewsQuery',
      entityId: queryId,
      metadata: summary,
    });

    return summary;
  }

  async processDueQueries() {
    const organizations = await this.prisma.webNewsQuery.findMany({
      where: { active: true },
      select: { organizationId: true },
      distinct: ['organizationId'],
    });

    for (const organization of organizations) {
      await this.runForOrganization(organization.organizationId, undefined, true);
    }
  }

  private async runForOrganization(
    organizationId: string,
    scopedQueries?: WebNewsQuery[],
    dueOnly = false,
  ): Promise<WebNewsCheckSummary> {
    if (this.runningOrganizations.has(organizationId)) {
      return {
        organizationId,
        checkedAt: new Date().toISOString(),
        queriesProcessed: 0,
        providerCalls: 0,
        createdMentions: 0,
        createdAlerts: 0,
        skippedDuplicates: 0,
        matchedResults: 0,
        errors: ['Verification deja en cours pour cette organisation.'],
      };
    }

    this.runningOrganizations.add(organizationId);

    const summary: WebNewsCheckSummary = {
      organizationId,
      checkedAt: new Date().toISOString(),
      queriesProcessed: 0,
      providerCalls: 0,
      createdMentions: 0,
      createdAlerts: 0,
      skippedDuplicates: 0,
      matchedResults: 0,
      errors: [],
    };

    try {
      const [queries, providerConnections, keywords] = await Promise.all([
        scopedQueries
          ? Promise.resolve(scopedQueries)
          : this.prisma.webNewsQuery.findMany({
              where: { organizationId, active: true },
              orderBy: { updatedAt: 'asc' },
            }),
        this.prisma.searchProviderConnection.findMany({
          where: { organizationId, active: true },
          orderBy: { updatedAt: 'asc' },
        }),
        this.prisma.keyword.findMany({
          where: { organizationId, active: true },
        }),
      ]);

      const eligibleQueries = dueOnly ? queries.filter((query) => this.isDue(query)) : queries;
      const activeProviders = providerConnections.filter((provider) =>
        this.providers.has(provider.provider),
      );

      for (const query of eligibleQueries) {
        summary.queriesProcessed += 1;

        for (const providerConnection of activeProviders) {
          summary.providerCalls += 1;

          try {
            const provider = this.providers.get(providerConnection.provider);
            if (!provider) {
              continue;
            }

            const results = await provider.search(query.query, {
              language: query.language ?? undefined,
              country: query.country ?? undefined,
              apiKey: this.resolveApiKey(providerConnection),
              baseUrl: providerConnection.baseUrl ?? undefined,
              config: this.asRecord(providerConnection.config),
            });

            await this.prisma.searchProviderConnection.update({
              where: { id: providerConnection.id },
              data: { lastCheckedAt: new Date() },
            });

            for (const result of results) {
              const match = this.keywordMatcherService.match(
                `${result.title} ${result.summary}`,
                keywords,
                result.platform,
                { requireIdentityAnchor: true },
              );

              if (!match) {
                continue;
              }

              summary.matchedResults += 1;

              const duplicate = await this.prisma.mention.findFirst({
                where: {
                  organizationId,
                  OR: [
                    ...(result.externalId ? [{ externalId: result.externalId }] : []),
                    { url: result.url },
                  ],
                },
                select: { id: true },
              });

              if (duplicate) {
                summary.skippedDuplicates += 1;
                continue;
              }

              const mention = await this.prisma.mention.create({
                data: {
                  organizationId,
                  monitoredProfileId: match.monitoredProfileId,
                  platform: result.platform,
                  sourceName: result.sourceName,
                  externalId: result.externalId,
                  authorName: result.author ?? null,
                  title: result.title,
                  content: result.summary,
                  url: result.url,
                  matchedKeywords: match.matchedKeywords,
                  sentiment: Sentiment.UNKNOWN,
                  priority: match.highestPriority,
                  detectedAt: new Date(),
                  publishedAt: result.publishedAt,
                  rawJson: result.rawJson as Prisma.InputJsonValue,
                },
              });

              summary.createdMentions += 1;

              if (
                match.highestPriority === Priority.HIGH ||
                match.highestPriority === Priority.CRITICAL
              ) {
                await this.prisma.alert.create({
                  data: {
                    organizationId,
                    mentionId: mention.id,
                    alertType: AlertType.IN_APP,
                    severity: match.highestPriority,
                    title: `Alerte Web/News ${match.highestPriority}`,
                    message: `Nouvel article detecte par ${providerConnection.label}: ${result.title}`,
                    status: AlertStatus.PENDING,
                  },
                });

                summary.createdAlerts += 1;
              }
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Erreur provider inconnue.';
            summary.errors.push(
              `${providerConnection.label} / ${query.name}: ${message}`,
            );
            this.logger.warn(
              `WebNews provider ${providerConnection.provider} failed for query ${query.id}: ${message}`,
            );
          }
        }

        await this.prisma.webNewsQuery.update({
          where: { id: query.id },
          data: { lastCheckedAt: new Date() },
        });
      }
    } finally {
      this.runningOrganizations.delete(organizationId);
    }

    return summary;
  }

  private sanitizeProvider(provider: SearchProviderConnection) {
    return {
      id: provider.id,
      organizationId: provider.organizationId,
      provider: provider.provider,
      label: provider.label,
      baseUrl: provider.baseUrl,
      active: provider.active,
      config: provider.config,
      lastCheckedAt: provider.lastCheckedAt,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      hasApiKey: Boolean(provider.apiKeyEncrypted),
    };
  }

  private async findProviderRecord(organizationId: string, id: string) {
    const provider = await this.prisma.searchProviderConnection.findFirst({
      where: { organizationId, id },
    });

    if (!provider) {
      throw new NotFoundException('Provider de recherche introuvable.');
    }

    return provider;
  }

  private async findQueryRecord(organizationId: string, id: string) {
    const query = await this.prisma.webNewsQuery.findFirst({
      where: { organizationId, id },
    });

    if (!query) {
      throw new NotFoundException('Requete Web/News introuvable.');
    }

    return query;
  }

  private isDue(query: WebNewsQuery) {
    if (!query.lastCheckedAt) {
      return true;
    }

    const elapsedMs = Date.now() - query.lastCheckedAt.getTime();
    return elapsedMs >= query.checkIntervalMinutes * 60 * 1000;
  }

  private resolveApiKey(provider: SearchProviderConnection) {
    if (provider.apiKeyEncrypted) {
      return this.encryptionService.decrypt(provider.apiKeyEncrypted);
    }

    return undefined;
  }

  private asRecord(value: Prisma.JsonValue | null | undefined) {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  }
}
