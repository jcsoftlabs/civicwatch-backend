import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateMonitoredProfileDto } from './dto/create-monitored-profile.dto';
import { UpdateMonitoredProfileDto } from './dto/update-monitored-profile.dto';
import { MonitoredProfilesService } from './monitored-profiles.service';

@ApiTags('Monitored Profiles')
@ApiBearerAuth()
@Controller('organizations/:organizationId/profiles')
@OrganizationScope('organizationId')
export class MonitoredProfilesController {
  constructor(
    private readonly monitoredProfilesService: MonitoredProfilesService,
  ) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les profils surveillés' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.monitoredProfilesService.findAll(organizationId);
  }

  @Post()
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Créer un profil surveillé' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateMonitoredProfileDto,
  ) {
    return this.monitoredProfilesService.create(organizationId, user.userId, dto);
  }

  @Get(':id')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiParam({ name: 'id' })
  findOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.monitoredProfilesService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateMonitoredProfileDto,
  ) {
    return this.monitoredProfilesService.update(
      organizationId,
      id,
      user.userId,
      dto,
    );
  }

  @Delete(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.monitoredProfilesService.remove(organizationId, id, user.userId);
  }
}
