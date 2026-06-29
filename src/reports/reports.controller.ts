import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('organizations/:organizationId/reports')
@OrganizationScope('organizationId')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les rapports' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.reportsService.findAll(organizationId);
  }

  @Post('generate')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Générer un rapport' })
  generate(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: GenerateReportDto,
  ) {
    return this.reportsService.generate(organizationId, user.userId, dto);
  }

  @Get(':id')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Détail d’un rapport' })
  findOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.reportsService.findOne(organizationId, id);
  }
}
