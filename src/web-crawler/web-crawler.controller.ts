import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateCrawlSourceDto } from './dto/create-crawl-source.dto';
import { UpdateCrawlSourceDto } from './dto/update-crawl-source.dto';
import { WebCrawlerService } from './web-crawler.service';

@ApiTags('WebCrawler')
@ApiBearerAuth()
@Controller('organizations/:organizationId/crawl-sources')
@OrganizationScope('organizationId')
export class WebCrawlerController {
  constructor(private readonly webCrawlerService: WebCrawlerService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les sources de crawl autorisees' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.webCrawlerService.findAll(organizationId);
  }

  @Post()
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Creer une source de crawl' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCrawlSourceDto,
  ) {
    return this.webCrawlerService.create(organizationId, user.userId, dto);
  }

  @Get(':id')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Detail d une source de crawl' })
  findOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.webCrawlerService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier une source de crawl' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCrawlSourceDto,
  ) {
    return this.webCrawlerService.update(organizationId, id, user.userId, dto);
  }

  @Delete(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une source de crawl' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webCrawlerService.remove(organizationId, id, user.userId);
  }

  @Post(':id/check-now')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Lancer un crawl manuel immediat' })
  checkNow(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.webCrawlerService.checkNow(organizationId, id, user.userId);
  }
}
