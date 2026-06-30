import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiConnectionPlatform, ApiConnectionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateXConnectionDto {
  @ApiPropertyOptional({ enum: ApiConnectionPlatform, default: ApiConnectionPlatform.X })
  @IsOptional()
  @IsEnum(ApiConnectionPlatform)
  platform?: ApiConnectionPlatform = ApiConnectionPlatform.X;

  @ApiProperty()
  @IsString()
  label!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bearerToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apiSecret?: string;

  @ApiPropertyOptional({ enum: ApiConnectionStatus, default: ApiConnectionStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ApiConnectionStatus)
  status?: ApiConnectionStatus = ApiConnectionStatus.ACTIVE;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  useEnvBearerToken?: boolean;
}
