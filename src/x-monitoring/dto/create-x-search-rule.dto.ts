import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateXSearchRuleDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  query!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 1440 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1440)
  checkIntervalMinutes?: number;
}
