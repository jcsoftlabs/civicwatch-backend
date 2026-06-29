import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuditLogsService } from './audit-logs.service';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('organizations/:organizationId/audit-logs')
@OrganizationScope('organizationId')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
  )
  @ApiOperation({ summary: "Lister les logs d'audit d'une organisation" })
  @ApiParam({ name: 'organizationId' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.auditLogsService.findAllByOrganization(organizationId);
  }
}
