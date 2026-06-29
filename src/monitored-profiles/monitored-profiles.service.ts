import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonitoredProfileDto } from './dto/create-monitored-profile.dto';
import { UpdateMonitoredProfileDto } from './dto/update-monitored-profile.dto';

@Injectable()
export class MonitoredProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  findAll(organizationId: string) {
    return this.prisma.monitoredProfile.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    organizationId: string,
    userId: string,
    dto: CreateMonitoredProfileDto,
  ) {
    const profile = await this.prisma.monitoredProfile.create({
      data: {
        organizationId,
        ...dto,
      },
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'monitored_profile.created',
      entityType: 'MonitoredProfile',
      entityId: profile.id,
      metadata: dto,
    });

    return profile;
  }

  async findOne(organizationId: string, id: string) {
    const profile = await this.prisma.monitoredProfile.findFirst({
      where: { id, organizationId },
    });
    if (!profile) {
      throw new NotFoundException('Profil surveillé introuvable.');
    }
    return profile;
  }

  async update(
    organizationId: string,
    id: string,
    userId: string,
    dto: UpdateMonitoredProfileDto,
  ) {
    await this.findOne(organizationId, id);
    const profile = await this.prisma.monitoredProfile.update({
      where: { id },
      data: dto,
    });

    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'monitored_profile.updated',
      entityType: 'MonitoredProfile',
      entityId: id,
      metadata: dto,
    });

    return profile;
  }

  async remove(organizationId: string, id: string, userId: string) {
    await this.findOne(organizationId, id);
    await this.prisma.monitoredProfile.delete({ where: { id } });
    await this.auditLogsService.log({
      organizationId,
      userId,
      action: 'monitored_profile.deleted',
      entityType: 'MonitoredProfile',
      entityId: id,
    });
    return { success: true };
  }
}
