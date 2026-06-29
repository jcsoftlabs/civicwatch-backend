import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertStatus, Priority } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { UpdateAlertStatusDto } from './dto/update-alert-status.dto';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.alert.findMany({
      where: { organizationId },
      include: { mention: true },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(organizationId: string, userId: string, dto: CreateAlertDto) {
    const alert = await this.prisma.alert.create({
      data: {
        organizationId,
        mentionId: dto.mentionId,
        alertType: dto.alertType,
        severity: dto.severity,
        title: dto.title,
        message: dto.message,
        status: dto.status ?? AlertStatus.PENDING,
        sentAt: dto.sentAt ? new Date(dto.sentAt) : undefined,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'alert.created',
      entityType: 'Alert',
      entityId: alert.id,
      metadata: dto,
    });

    return alert;
  }

  async acknowledge(organizationId: string, id: string, userId: string) {
    const alert = await this.getAlert(organizationId, id);
    const updated = await this.prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: AlertStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'alert.acknowledged',
      entityType: 'Alert',
      entityId: id,
    });

    return updated;
  }

  async updateStatus(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateAlertStatusDto,
  ) {
    const alert = await this.getAlert(organizationId, id);
    const updated = await this.prisma.alert.update({
      where: { id: alert.id },
      data: {
        status: dto.status,
        ...(dto.status === AlertStatus.ACKNOWLEDGED
          ? { acknowledgedAt: new Date() }
          : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'alert.status_updated',
      entityType: 'Alert',
      entityId: id,
      metadata: dto,
    });

    return updated;
  }

  async findCriticalAlerts(organizationId: string) {
    return this.prisma.alert.findMany({
      where: {
        organizationId,
        severity: Priority.CRITICAL,
      },
      orderBy: { createdAt: 'desc' },
      include: { mention: true },
      take: 5,
    });
  }

  private async getAlert(organizationId: string, id: string) {
    const alert = await this.prisma.alert.findFirst({
      where: { organizationId, id },
    });
    if (!alert) {
      throw new NotFoundException('Alerte introuvable.');
    }
    return alert;
  }
}
