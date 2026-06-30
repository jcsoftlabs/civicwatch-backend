import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateCrawlSourceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsUrl()
  baseUrl!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsUrl({}, { each: true })
  startUrls!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  allowedDomains!: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  respectRobotsTxt?: boolean;

  @ApiPropertyOptional({ default: 60, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  checkIntervalMinutes?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxPagesPerRun?: number;
}
