import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateSearchProviderConnectionDto } from './dto/create-search-provider-connection.dto';
import { CreateWebNewsQueryDto } from './dto/create-web-news-query.dto';
import { UpdateSearchProviderConnectionDto } from './dto/update-search-provider-connection.dto';
import { UpdateWebNewsQueryDto } from './dto/update-web-news-query.dto';
import { WebNewsService } from './web-news.service';

@ApiTags('WebNews')
@ApiBearerAuth()
@Controller('organizations/:organizationId/web-news')
@OrganizationScope('organizationId')
export class WebNewsController {
  constructor(private readonly webNewsService: WebNewsService) {}

  @Get('providers')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les providers de recherche web/news' })
  findProviders(@Param('organizationId') organizationId: string) {
    return this.webNewsService.findProviders(organizationId);
  }

  @Post('providers')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Creer un provider de recherche web/news' })
  createProvider(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateSearchProviderConnectionDto,
  ) {
    return this.webNewsService.createProvider(organizationId, user.userId, dto);
  }

  @Patch('providers/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier un provider de recherche web/news' })
  updateProvider(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateSearchProviderConnectionDto,
  ) {
    return this.webNewsService.updateProvider(organizationId, id, user.userId, dto);
  }

  @Delete('providers/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer un provider de recherche web/news' })
  removeProvider(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webNewsService.removeProvider(organizationId, id, user.userId);
  }

  @Get('queries')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les requetes web/news' })
  findQueries(@Param('organizationId') organizationId: string) {
    return this.webNewsService.findQueries(organizationId);
  }

  @Post('queries')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Creer une requete web/news' })
  createQuery(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateWebNewsQueryDto,
  ) {
    return this.webNewsService.createQuery(organizationId, user.userId, dto);
  }

  @Patch('queries/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier une requete web/news' })
  updateQuery(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateWebNewsQueryDto,
  ) {
    return this.webNewsService.updateQuery(organizationId, id, user.userId, dto);
  }

  @Delete('queries/:id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une requete web/news' })
  removeQuery(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webNewsService.removeQuery(organizationId, id, user.userId);
  }

  @Post('check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Lancer une verification web/news immediate' })
  checkNow(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webNewsService.checkNow(organizationId, user.userId);
  }

  @Post('queries/:id/check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Lancer une verification immediate pour une requete web/news' })
  checkQueryNow(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webNewsService.checkQueryNow(organizationId, id, user.userId);
  }
}
