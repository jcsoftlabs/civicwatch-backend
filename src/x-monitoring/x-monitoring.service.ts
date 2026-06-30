import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AlertStatus,
  AlertType,
  ApiConnection,
  ApiConnectionPlatform,
  ApiConnectionStatus,
  Keyword,
  Platform,
  Prisma,
  Priority,
  XSearchRule,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EncryptionService } from '../common/services/encryption.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaService } from '../prisma/prisma.service';
import { CheckNowDto } from './dto/check-now.dto';
import { CreateXConnectionDto } from './dto/create-x-connection.dto';
import { CreateXSearchRuleDto } from './dto/create-x-search-rule.dto';
import { UpdateXConnectionDto } from './dto/update-x-connection.dto';
import { UpdateXSearchRuleDto } from './dto/update-x-search-rule.dto';
import { XApiClient } from './x-api.client';
import { XNormalizerService } from './x-normalizer.service';
import { XApiUser, XRecentSearchResponse } from './x-api.types';

export interface XCheckSummary {
  organizationId: string;
  checkedAt: string;
  rulesProcessed: number;
  createdMentions: number;
  createdAlerts: number;
  skippedDuplicates: number;
  matchedPosts: number;
  errors: string[];
}

@Injectable()
export class XMonitoringService {
  private readonly logger = new Logger(XMonitoringService.name);
  private readonly runningOrganizations = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly encryptionService: EncryptionService,
    private readonly keywordMatcherService: KeywordMatcherService,
    private readonly xApiClient: XApiClient,
    private readonly xNormalizerService: XNormalizerService,
  ) {}

  async findConnections(organizationId: string) {
    const connections = await this.prisma.apiConnection.findMany({
      where: {
        organizationId,
        platform: ApiConnectionPlatform.X,
      },
      orderBy: { createdAt: 'desc' },
    });

    return connections.map((connection) => this.sanitizeConnection(connection));
  }

  async createConnection(
    organizationId: string,
    userId: string,
    dto: CreateXConnectionDto,
  ) {
    const connection = await this.prisma.apiConnection.create({
      data: {
        organizationId,
        platform: dto.platform ?? ApiConnectionPlatform.X,
        label: dto.label,
        accessTokenEncrypted: this.encryptOptional(dto.accessToken),
        refreshTokenEncrypted: this.encryptOptional(dto.refreshToken),
        bearerTokenEncrypted: this.encryptOptional(dto.bearerToken),
        apiKeyEncrypted: this.encryptOptional(dto.apiKey),
        apiSecretEncrypted: this.encryptOptional(dto.apiSecret),
        status: dto.status ?? ApiConnectionStatus.ACTIVE,
        config: this.buildConnectionConfig(dto) as Prisma.InputJsonValue,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.connection_created',
      entityType: 'ApiConnection',
      entityId: connection.id,
      metadata: this.redactConnectionPayload(dto),
    });

    return this.sanitizeConnection(connection);
  }

  async updateConnection(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateXConnectionDto,
  ) {
    const existing = await this.findConnectionRecord(organizationId, id);

    const connection = await this.prisma.apiConnection.update({
      where: { id: existing.id },
      data: {
        ...(dto.platform ? { platform: dto.platform } : {}),
        ...(dto.label ? { label: dto.label } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.config !== undefined || dto.useEnvBearerToken !== undefined
          ? {
              config: this.buildConnectionConfig(dto, existing.config as Record<string, unknown>),
            }
          : {}),
        ...(dto.accessToken !== undefined
          ? { accessTokenEncrypted: this.encryptOptional(dto.accessToken) }
          : {}),
        ...(dto.refreshToken !== undefined
          ? { refreshTokenEncrypted: this.encryptOptional(dto.refreshToken) }
          : {}),
        ...(dto.bearerToken !== undefined
          ? { bearerTokenEncrypted: this.encryptOptional(dto.bearerToken) }
          : {}),
        ...(dto.apiKey !== undefined ? { apiKeyEncrypted: this.encryptOptional(dto.apiKey) } : {}),
        ...(dto.apiSecret !== undefined
          ? { apiSecretEncrypted: this.encryptOptional(dto.apiSecret) }
          : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.connection_updated',
      entityType: 'ApiConnection',
      entityId: id,
      metadata: this.redactConnectionPayload(dto),
    });

    return this.sanitizeConnection(connection);
  }

  async removeConnection(organizationId: string, id: string, userId: string) {
    const existing = await this.findConnectionRecord(organizationId, id);
    await this.prisma.apiConnection.delete({ where: { id: existing.id } });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.connection_deleted',
      entityType: 'ApiConnection',
      entityId: id,
    });

    return { success: true };
  }

  findRules(organizationId: string) {
    return this.prisma.xSearchRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRule(organizationId: string, userId: string, dto: CreateXSearchRuleDto) {
    const rule = await this.prisma.xSearchRule.create({
      data: {
        organizationId,
        name: dto.name,
        query: dto.query,
        active: dto.active ?? true,
        checkIntervalMinutes: dto.checkIntervalMinutes ?? 5,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.rule_created',
      entityType: 'XSearchRule',
      entityId: rule.id,
      metadata: dto,
    });

    return rule;
  }

  async updateRule(organizationId: string, id: string, userId: string, dto: UpdateXSearchRuleDto) {
    const existing = await this.findRuleRecord(organizationId, id);

    const rule = await this.prisma.xSearchRule.update({
      where: { id: existing.id },
      data: dto,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.rule_updated',
      entityType: 'XSearchRule',
      entityId: id,
      metadata: dto,
    });

    return rule;
  }

  async removeRule(organizationId: string, id: string, userId: string) {
    const existing = await this.findRuleRecord(organizationId, id);
    await this.prisma.xSearchRule.delete({ where: { id: existing.id } });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.rule_deleted',
      entityType: 'XSearchRule',
      entityId: id,
    });

    return { success: true };
  }

  async checkNow(organizationId: string, userId?: string, dto?: CheckNowDto) {
    const summary = await this.runForOrganization(organizationId, undefined, false, dto);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.check_now',
      entityType: 'Organization',
      entityId: organizationId,
      metadata: summary,
    });

    return summary;
  }

  async checkRuleNow(
    organizationId: string,
    ruleId: string,
    userId?: string,
    dto?: CheckNowDto,
  ) {
    const rule = await this.findRuleRecord(organizationId, ruleId);
    const summary = await this.runForOrganization(organizationId, [rule], false, dto);

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'x.rule_check_now',
      entityType: 'XSearchRule',
      entityId: ruleId,
      metadata: summary,
    });

    return summary;
  }

  async processDueRules() {
    const organizations = await this.prisma.xSearchRule.findMany({
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
    scopedRules?: XSearchRule[],
    dueOnly = false,
    dto?: CheckNowDto,
  ): Promise<XCheckSummary> {
    if (this.runningOrganizations.has(organizationId)) {
      return {
        organizationId,
        checkedAt: new Date().toISOString(),
        rulesProcessed: 0,
        createdMentions: 0,
        createdAlerts: 0,
        skippedDuplicates: 0,
        matchedPosts: 0,
        errors: ['Verification X deja en cours pour cette organisation.'],
      };
    }

    this.runningOrganizations.add(organizationId);

    const summary: XCheckSummary = {
      organizationId,
      checkedAt: new Date().toISOString(),
      rulesProcessed: 0,
      createdMentions: 0,
      createdAlerts: 0,
      skippedDuplicates: 0,
      matchedPosts: 0,
      errors: [],
    };

    try {
      const [connection, rules, keywords] = await Promise.all([
        this.findActiveConnection(organizationId),
        scopedRules
          ? Promise.resolve(scopedRules)
          : this.prisma.xSearchRule.findMany({
              where: { organizationId, active: true },
              orderBy: { updatedAt: 'asc' },
            }),
        this.prisma.keyword.findMany({
          where: { organizationId, active: true },
        }),
      ]);

      if (!connection) {
        summary.errors.push('Aucune connexion X active configuree.');
        return summary;
      }

      const bearerToken = this.resolveBearerToken(connection);
      if (!bearerToken) {
        summary.errors.push('Aucun bearer token X disponible pour cette organisation.');
        return summary;
      }

      const xKeywords = keywords.filter((keyword) => this.supportsX(keyword));
      const eligibleRules = dueOnly ? rules.filter((rule) => this.isDue(rule)) : rules;

      for (const rule of eligibleRules) {
        summary.rulesProcessed += 1;

        try {
          const response = await this.xApiClient.recentSearch({
            query: rule.query,
            bearerToken,
            sinceTime: rule.lastCheckedAt ?? undefined,
            maxResults: dto?.maxResults,
          });

          const created = await this.persistSearchResults(
            organizationId,
            rule,
            xKeywords,
            response,
            summary,
          );

          await this.prisma.apiConnection.update({
            where: { id: connection.id },
            data: {
              lastUsedAt: new Date(),
              status: ApiConnectionStatus.ACTIVE,
            },
          });

          await this.prisma.xSearchRule.update({
            where: { id: rule.id },
            data: {
              lastCheckedAt: new Date(),
            },
          });

          if (created > 0) {
            this.logger.log(`X rule ${rule.id} created ${created} mentions.`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erreur X API inconnue.';
          summary.errors.push(`Rule "${rule.name}": ${message}`);

          await this.prisma.apiConnection.update({
            where: { id: connection.id },
            data: {
              status: /authorization failed|invalid token|401|403/i.test(message)
                ? ApiConnectionStatus.ERROR
                : connection.status,
              lastUsedAt: new Date(),
            },
          });

          this.logger.error(`X rule ${rule.id} failed: ${message}`, error);
        }
      }
    } finally {
      this.runningOrganizations.delete(organizationId);
    }

    return summary;
  }

  private async persistSearchResults(
    organizationId: string,
    rule: XSearchRule,
    keywords: Keyword[],
    response: XRecentSearchResponse,
    summary: XCheckSummary,
  ) {
    const usersById = new Map(
      (response.includes?.users ?? []).map((user) => [user.id, user] satisfies [string, XApiUser]),
    );

    let createdCount = 0;

    for (const post of response.data ?? []) {
      const author = post.author_id ? usersById.get(post.author_id) : undefined;
      const match = this.keywordMatcherService.match(post.text, keywords, Platform.X, {
        requireIdentityAnchor: true,
      });

      if (!match) {
        continue;
      }

      summary.matchedPosts += 1;

      const duplicate = await this.prisma.mention.findFirst({
        where: {
          organizationId,
          platform: Platform.X,
          externalId: post.id,
        },
        select: { id: true },
      });

      if (duplicate) {
        summary.skippedDuplicates += 1;
        continue;
      }

      const mention = await this.prisma.mention.create({
        data: this.xNormalizerService.normalizeMentionInput({
          organizationId,
          post,
          author,
          match,
          rule,
        }),
      });

      createdCount += 1;
      summary.createdMentions += 1;

      if (match.highestPriority === Priority.HIGH || match.highestPriority === Priority.CRITICAL) {
        await this.prisma.alert.create({
          data: {
            organizationId,
            mentionId: mention.id,
            alertType: AlertType.IN_APP,
            severity: match.highestPriority,
            title: `Alerte X ${match.highestPriority}`,
            message: `Nouveau post X detecte pour la regle ${rule.name}: ${match.matchedKeywords.join(', ')}`,
            status: AlertStatus.PENDING,
          },
        });

        summary.createdAlerts += 1;
      }
    }

    return createdCount;
  }

  private supportsX(keyword: Keyword) {
    return Array.isArray(keyword.platforms)
      ? (keyword.platforms as string[]).includes(Platform.X)
      : false;
  }

  private isDue(rule: XSearchRule) {
    if (!rule.lastCheckedAt) {
      return true;
    }

    const elapsedMs = Date.now() - rule.lastCheckedAt.getTime();
    return elapsedMs >= rule.checkIntervalMinutes * 60 * 1000;
  }

  private sanitizeConnection(connection: ApiConnection) {
    return {
      id: connection.id,
      organizationId: connection.organizationId,
      platform: connection.platform,
      label: connection.label,
      status: connection.status,
      config: connection.config,
      lastUsedAt: connection.lastUsedAt,
      expiresAt: connection.expiresAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
      hasAccessToken: Boolean(connection.accessTokenEncrypted),
      hasRefreshToken: Boolean(connection.refreshTokenEncrypted),
      hasBearerToken: Boolean(connection.bearerTokenEncrypted),
      hasApiKey: Boolean(connection.apiKeyEncrypted),
      hasApiSecret: Boolean(connection.apiSecretEncrypted),
      maskedBearerToken: connection.bearerTokenEncrypted ? '********' : null,
    };
  }

  private redactConnectionPayload(dto: CreateXConnectionDto | UpdateXConnectionDto) {
    return {
      ...dto,
      accessToken: dto.accessToken ? '[REDACTED]' : undefined,
      refreshToken: dto.refreshToken ? '[REDACTED]' : undefined,
      bearerToken: dto.bearerToken ? '[REDACTED]' : undefined,
      apiKey: dto.apiKey ? '[REDACTED]' : undefined,
      apiSecret: dto.apiSecret ? '[REDACTED]' : undefined,
    };
  }

  private buildConnectionConfig(
    dto: Pick<CreateXConnectionDto, 'config' | 'useEnvBearerToken'>,
    currentConfig: Record<string, unknown> = {},
  ) {
    return {
      ...currentConfig,
      ...(dto.config ?? {}),
      ...(dto.useEnvBearerToken !== undefined
        ? { useEnvBearerToken: dto.useEnvBearerToken }
        : {}),
    };
  }

  private encryptOptional(value?: string) {
    if (value === undefined) {
      return undefined;
    }

    return value ? this.encryptionService.encrypt(value) : null;
  }

  private resolveBearerToken(connection: ApiConnection) {
    if (connection.bearerTokenEncrypted) {
      return this.encryptionService.decrypt(connection.bearerTokenEncrypted);
    }

    const config = (connection.config ?? {}) as Record<string, unknown>;
    if (config.useEnvBearerToken) {
      return process.env.X_BEARER_TOKEN ?? null;
    }

    return null;
  }

  private async findActiveConnection(organizationId: string) {
    return this.prisma.apiConnection.findFirst({
      where: {
        organizationId,
        platform: ApiConnectionPlatform.X,
        status: ApiConnectionStatus.ACTIVE,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private async findConnectionRecord(organizationId: string, id: string) {
    const connection = await this.prisma.apiConnection.findFirst({
      where: {
        id,
        organizationId,
        platform: ApiConnectionPlatform.X,
      },
    });

    if (!connection) {
      throw new NotFoundException('Connexion X introuvable.');
    }

    return connection;
  }

  private async findRuleRecord(organizationId: string, id: string) {
    const rule = await this.prisma.xSearchRule.findFirst({
      where: { id, organizationId },
    });

    if (!rule) {
      throw new NotFoundException('Regle X introuvable.');
    }

    return rule;
  }
}
