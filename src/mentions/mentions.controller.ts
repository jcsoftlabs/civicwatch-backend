import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { OrganizationScope } from '../common/decorators/organization-scope.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateMentionDto } from './dto/create-mention.dto';
import { MentionsQueryDto } from './dto/mentions-query.dto';
import { UpdateMentionDto } from './dto/update-mention.dto';
import { MentionsService } from './mentions.service';

@ApiTags('Mentions')
@ApiBearerAuth()
@Controller('organizations/:organizationId/mentions')
@OrganizationScope('organizationId')
export class MentionsController {
  constructor(private readonly mentionsService: MentionsService) {}

  @Get()
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  @ApiOperation({ summary: 'Lister les mentions avec filtres' })
  findAll(
    @Param('organizationId') organizationId: string,
    @Query() query: MentionsQueryDto,
  ) {
    return this.mentionsService.findAll(organizationId, query);
  }

  @Post()
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  @ApiOperation({ summary: 'Créer une mention' })
  create(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateMentionDto,
  ) {
    return this.mentionsService.create(organizationId, user.userId, dto);
  }

  @Get(':id')
  @Roles(
    OrganizationRole.SUPER_ADMIN,
    OrganizationRole.ORG_ADMIN,
    OrganizationRole.ANALYST,
    OrganizationRole.VIEWER,
  )
  findOne(@Param('organizationId') organizationId: string, @Param('id') id: string) {
    return this.mentionsService.findOne(organizationId, id);
  }

  @Patch(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN, OrganizationRole.ANALYST)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateMentionDto,
  ) {
    return this.mentionsService.update(organizationId, id, user.userId, dto);
  }

  @Delete(':id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.mentionsService.remove(organizationId, id, user.userId);
  }
}
