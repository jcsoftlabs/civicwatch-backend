import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';

@Injectable()
export class KeywordsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.keyword.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, userId: string, dto: CreateKeywordDto) {
    const keyword = await this.prisma.keyword.create({
      data: {
        organizationId,
        monitoredProfileId: dto.monitoredProfileId,
        keyword: dto.keyword,
        keywordType: dto.keywordType,
        priority: dto.priority,
        platforms: dto.platforms,
        active: dto.active ?? true,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'keyword.created',
      entityType: 'Keyword',
      entityId: keyword.id,
      metadata: dto,
    });

    return keyword;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateKeywordDto,
  ) {
    const existing = await this.prisma.keyword.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Mot-clé introuvable.');
    }

    const keyword = await this.prisma.keyword.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.platforms ? { platforms: dto.platforms } : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'keyword.updated',
      entityType: 'Keyword',
      entityId: id,
      metadata: dto,
    });

    return keyword;
  }

  async remove(organizationId: string, id: string, userId: string) {
    const existing = await this.prisma.keyword.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException('Mot-clé introuvable.');
    }

    await this.prisma.keyword.delete({ where: { id } });
    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'keyword.deleted',
      entityType: 'Keyword',
      entityId: id,
    });

    return { success: true };
  }
}
