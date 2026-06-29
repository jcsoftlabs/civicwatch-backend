import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('organizations/:organizationId/dashboard')
@OrganizationScope('organizationId')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Statistiques agrégées du dashboard' })
  stats(@Param('organizationId') organizationId: string) {
    return this.dashboardService.getStats(organizationId);
  }
}
