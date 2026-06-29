import { ApiProperty } from '@nestjs/swagger';
import { OrganizationType } from '@prisma/client';
import { IsEnum, IsString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  slug!: string;

  @ApiProperty({ enum: OrganizationType })
  @IsEnum(OrganizationType)
  type!: OrganizationType;

  @ApiProperty()
  @IsString()
  country!: string;
}
