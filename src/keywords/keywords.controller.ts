import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateKeywordDto } from './dto/create-keyword.dto';
import { UpdateKeywordDto } from './dto/update-keyword.dto';
import { KeywordsService } from './keywords.service';

@ApiTags('Keywords')
@ApiBearerAuth()
@Controller('organizations/:organizationId/keywords')
@OrganizationScope('organizationId')
export class KeywordsController {
  constructor(private readonly keywordsService: KeywordsService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les mots-clés' })
  findAll(@Param('organizationId') organizationId: string) {
    return this.keywordsService.findAll(organizationId);
  }

  @Post()
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Créer un mot-clé' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateKeywordDto,
  ) {
    return this.keywordsService.create(organizationId, user.userId, dto);
  }

  @Patch(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Modifier un mot-clé' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateKeywordDto,
  ) {
    return this.keywordsService.update(organizationId, id, user.userId, dto);
  }

  @Delete(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer un mot-clé' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.keywordsService.remove(organizationId, id, user.userId);
  }
}
