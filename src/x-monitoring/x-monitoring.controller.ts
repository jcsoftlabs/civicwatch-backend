import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CheckNowDto } from './dto/check-now.dto';
import { CreateXConnectionDto } from './dto/create-x-connection.dto';
import { CreateXSearchRuleDto } from './dto/create-x-search-rule.dto';
import { UpdateXConnectionDto } from './dto/update-x-connection.dto';
import { UpdateXSearchRuleDto } from './dto/update-x-search-rule.dto';
import { XMonitoringService } from './x-monitoring.service';

@ApiTags('X Monitoring')
@ApiBearerAuth()
@Controller('organizations/:organizationId/x')
@OrganizationScope('organizationId')
export class XMonitoringController {
  constructor(private readonly xMonitoringService: XMonitoringService) {}

  @Get('connections')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les connexions X' })
  findConnections(@Param('organizationId') organizationId: string) {
    return this.xMonitoringService.findConnections(organizationId);
  }

  @Post('connections')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Creer une connexion X' })
  createConnection(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateXConnectionDto,
  ) {
    return this.xMonitoringService.createConnection(organizationId, user.userId, dto);
  }

  @Patch('connections/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier une connexion X' })
  updateConnection(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateXConnectionDto,
  ) {
    return this.xMonitoringService.updateConnection(organizationId, id, user.userId, dto);
  }

  @Delete('connections/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une connexion X' })
  removeConnection(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.xMonitoringService.removeConnection(organizationId, id, user.userId);
  }

  @Get('rules')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les regles X Recent Search' })
  findRules(@Param('organizationId') organizationId: string) {
    return this.xMonitoringService.findRules(organizationId);
  }

  @Post('rules')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Creer une regle X Recent Search' })
  createRule(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateXSearchRuleDto,
  ) {
    return this.xMonitoringService.createRule(organizationId, user.userId, dto);
  }

  @Patch('rules/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier une regle X Recent Search' })
  updateRule(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateXSearchRuleDto,
  ) {
    return this.xMonitoringService.updateRule(organizationId, id, user.userId, dto);
  }

  @Delete('rules/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une regle X Recent Search' })
  removeRule(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.xMonitoringService.removeRule(organizationId, id, user.userId);
  }

  @Post('check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Lancer une verification X immediate' })
  checkNow(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CheckNowDto,
  ) {
    return this.xMonitoringService.checkNow(organizationId, user.userId, dto);
  }

  @Post('rules/:id/check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Lancer une verification immediate pour une regle X' })
  checkRuleNow(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CheckNowDto,
  ) {
    return this.xMonitoringService.checkRuleNow(organizationId, id, user.userId, dto);
  }
}
