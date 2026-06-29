import { Injectable, NotFoundException } from '@nestjs/common';
import { Sentiment } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateReportDto } from './dto/generate-report.dto';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.report.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async generate(organizationId: string, userId: string, dto: GenerateReportDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    const mentions = await this.prisma.mention.findMany({
      where: {
        organizationId,
        detectedAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    const negativeCount = mentions.filter(
      (mention) => mention.sentiment === Sentiment.NEGATIVE,
    ).length;
    const summary = `Rapport généré automatiquement pour ${mentions.length} mentions entre ${dto.periodStart} et ${dto.periodEnd}.`;
    const report = await this.prisma.report.create({
      data: {
        organizationId,
        title: dto.title,
        periodStart,
        periodEnd,
        summary,
        metrics: {
          totalMentions: mentions.length,
          negativeMentions: negativeCount,
        },
        recommendations: [
          'Répondre rapidement aux signaux critiques.',
          'Surveiller les mots-clés sensibles à forte hausse.',
          'Partager le rapport avec l’équipe communication.',
        ],
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'report.generated',
      entityType: 'Report',
      entityId: report.id,
      metadata: dto,
    });

    return report;
  }

  async findOne(organizationId: string, id: string) {
    const report = await this.prisma.report.findFirst({
      where: { organizationId, id },
    });
    if (!report) {
      throw new NotFoundException('Rapport introuvable.');
    }
    return report;
  }
}
