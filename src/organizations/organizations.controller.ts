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
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: "Lister les organisations de l'utilisateur" })
  findAll(@CurrentUser() user: { userId: string }) {
    return this.organizationsService.findAllForUser(user.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une organisation' })
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationsService.create(user.userId, dto);
  }

  @Get(':id')
  @OrganizationScope('id')
  @ApiOperation({ summary: 'Détail d’une organisation' })
  @ApiParam({ name: 'id' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @OrganizationScope('id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Modifier une organisation' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, user.userId, dto);
  }

  @Delete(':id')
  @OrganizationScope('id')
  @Roles(OrganizationRole.SUPER_ADMIN, OrganizationRole.ORG_ADMIN)
  @ApiOperation({ summary: 'Supprimer une organisation' })
  remove(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.organizationsService.remove(id, user.userId);
  }
}
