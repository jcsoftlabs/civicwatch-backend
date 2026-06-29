import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateRssSourceDto } from './dto/create-rss-source.dto';
import { UpdateRssSourceDto } from './dto/update-rss-source.dto';
import { RssService } from './rss.service';

@ApiTags('RSS')
@ApiBearerAuth()
@Controller('organizations/:organizationId/rss-sources')
@OrganizationScope('organizationId')
export class RssController {
  constructor(private readonly rssService: RssService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les sources RSS' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.rssService.findAll(organizationId);
  }

  @Post()
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Creer une source RSS' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateRssSourceDto,
  ) {
    return this.rssService.create(organizationId, user.userId, dto);
  }

  @Patch(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Modifier une source RSS' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateRssSourceDto,
  ) {
    return this.rssService.update(organizationId, id, user.userId, dto);
  }

  @Delete(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une source RSS' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.rssService.remove(organizationId, id, user.userId);
  }

  @Post(':id/check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Verifier immediatement une source RSS' })
  checkNow(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.rssService.checkNow(organizationId, id, user.userId);
  }
}
