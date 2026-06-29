import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMentionDto } from './dto/create-mention.dto';
import { MentionsQueryDto } from './dto/mentions-query.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';

@Injectable()
export class MentionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(organizationId: string, query: MentionsQueryDto) {
    const where: Prisma.MentionWhereInput = {
      organizationId,
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.sentiment ? { sentiment: query.sentiment } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            detectedAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { content: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { authorName: { contains: query.search, mode: 'insensitive' } },
              { authorHandle: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const allItems = await this.prisma.mention.findMany({
      where,
      orderBy: { detectedAt: 'desc' },
    });

    const keywordFiltered = query.keyword
      ? allItems.filter((item) => {
          const keywords = Array.isArray(item.matchedKeywords)
            ? (item.matchedKeywords as string[])
            : [];
          return keywords.some((keyword) =>
            keyword.toLowerCase().includes(query.keyword!.toLowerCase()),
          );
        })
      : allItems;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const start = (page - 1) * limit;
    const data = keywordFiltered.slice(start, start + limit);

    return {
      data,
      meta: {
        total: keywordFiltered.length,
        page,
        limit,
        totalPages: Math.ceil(keywordFiltered.length / limit),
      },
    };
  }

  async create(organizationId: string, userId: string, dto: CreateMentionDto) {
    const mention = await this.prisma.mention.create({
      data: {
        organization: { connect: { id: organizationId } },
        ...(dto.monitoredProfileId
          ? { monitoredProfile: { connect: { id: dto.monitoredProfileId } } }
          : {}),
        platform: dto.platform,
        sourceName: dto.sourceName,
        externalId: dto.externalId,
        authorName: dto.authorName,
        authorHandle: dto.authorHandle,
        title: dto.title,
        content: dto.content,
        url: dto.url,
        matchedKeywords: dto.matchedKeywords,
        sentiment: dto.sentiment,
        priority: dto.priority,
        status: dto.status,
        detectedAt: new Date(dto.detectedAt),
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        engagement: dto.engagement as Prisma.InputJsonValue | undefined,
        rawJson: dto.rawJson as Prisma.InputJsonValue | undefined,
      } satisfies Prisma.MentionCreateInput,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'mention.created',
      entityType: 'Mention',
      entityId: mention.id,
      metadata: dto,
    });

    return mention;
  }

  async findOne(organizationId: string, id: string) {
    const mention = await this.prisma.mention.findFirst({
      where: { organizationId, id },
      include: { alerts: true },
    });
    if (!mention) {
      throw new NotFoundException('Mention introuvable.');
    }
    return mention;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateMentionDto,
  ) {
    await this.findOne(organizationId, id);
    const mention = await this.prisma.mention.update({
      where: { id },
      data: {
        ...(dto.monitoredProfileId !== undefined
          ? dto.monitoredProfileId
            ? { monitoredProfile: { connect: { id: dto.monitoredProfileId } } }
            : { monitoredProfile: { disconnect: true } }
          : {}),
        ...(dto.platform ? { platform: dto.platform } : {}),
        ...(dto.sourceName ? { sourceName: dto.sourceName } : {}),
        ...(dto.externalId !== undefined ? { externalId: dto.externalId } : {}),
        ...(dto.authorName !== undefined ? { authorName: dto.authorName } : {}),
        ...(dto.authorHandle !== undefined ? { authorHandle: dto.authorHandle } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content ? { content: dto.content } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.matchedKeywords ? { matchedKeywords: dto.matchedKeywords } : {}),
        ...(dto.sentiment ? { sentiment: dto.sentiment } : {}),
        ...(dto.priority ? { priority: dto.priority } : {}),
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.detectedAt ? { detectedAt: new Date(dto.detectedAt) } : {}),
        ...(dto.publishedAt ? { publishedAt: new Date(dto.publishedAt) } : {}),
        ...(dto.engagement !== undefined
          ? { engagement: dto.engagement as Prisma.InputJsonValue }
          : {}),
        ...(dto.rawJson !== undefined
          ? { rawJson: dto.rawJson as Prisma.InputJsonValue }
          : {}),
      } satisfies Prisma.MentionUpdateInput,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'mention.updated',
      entityType: 'Mention',
      entityId: id,
      metadata: dto,
    });

    return mention;
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    await this.prisma.mention.delete({ where: { id } });
    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'mention.deleted',
      entityType: 'Mention',
      entityId: id,
    });
    return { success: true };
  }
}
