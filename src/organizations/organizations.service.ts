import { Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRole } from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAllForUser(userId: string) {
    const members = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return members.map((member) => ({
      ...member.organization,
      role: member.role,
    }));
  }

  async create(userId: string, dto: CreateOrganizationDto) {
    const organization = await this.prisma.organization.create({
      data: {
        ...dto,
        slug: dto.slug.toLowerCase(),
        members: {
          create: {
            userId,
            role: OrganizationRole.ORG_ADMIN,
          },
        },
      },
    });

    await this.auditLogsService.log({
      organizationId: organization.id,
      userId,
      action: 'organization.created',
      entityType: 'Organization',
      entityId: organization.id,
      metadata: dto,
    });

    return organization;
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organisation introuvable.');
    }

    return organization;
  }

  async update(id: string, userId: string, dto: UpdateOrganizationDto) {
    await this.findOne(id);
    const organization = await this.prisma.organization.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.slug ? { slug: dto.slug.toLowerCase() } : {}),
      },
    });

    await this.auditLogsService.log({
      organizationId: id,
      userId,
      action: 'organization.updated',
      entityType: 'Organization',
      entityId: id,
      metadata: dto,
    });

    return organization;
  }

  async remove(id: string, userId: string) {
    await this.findOne(id);
    await this.prisma.organization.delete({ where: { id } });
    await this.auditLogsService.log({
      organizationId: id,
      userId,
      action: 'organization.deleted',
      entityType: 'Organization',
      entityId: id,
    });

    return { success: true };
  }
}
