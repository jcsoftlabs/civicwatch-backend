import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KeywordType, Platform, Priority } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateKeywordDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monitoredProfileId?: string;

  @ApiProperty()
  @IsString()
  keyword!: string;

  @ApiProperty({ enum: KeywordType })
  @IsEnum(KeywordType)
  keywordType!: KeywordType;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiProperty({ enum: Platform, isArray: true })
  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms!: Platform[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
