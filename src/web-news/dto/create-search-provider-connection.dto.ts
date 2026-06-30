import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SearchProvider } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateSearchProviderConnectionDto {
  @ApiProperty({ enum: SearchProvider })
  @IsEnum(SearchProvider)
  provider!: SearchProvider;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  baseUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
