import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class CreateRssSourceDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsUrl({
    require_tld: true,
  })
  feedUrl!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({
    require_tld: true,
  })
  websiteUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 15, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  checkIntervalMinutes?: number;
}
