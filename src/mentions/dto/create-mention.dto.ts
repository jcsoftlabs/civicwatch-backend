import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MentionStatus, Platform, Priority, Sentiment } from '@prisma/client';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateMentionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  monitoredProfileId?: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform!: Platform;

  @ApiProperty()
  @IsString()
  sourceName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorHandle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsString()
  content!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  url?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  matchedKeywords!: string[];

  @ApiProperty({ enum: Sentiment })
  @IsEnum(Sentiment)
  sentiment!: Sentiment;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  priority!: Priority;

  @ApiPropertyOptional({ enum: MentionStatus, default: MentionStatus.NEW })
  @IsOptional()
  @IsEnum(MentionStatus)
  status?: MentionStatus = MentionStatus.NEW;

  @ApiProperty()
  @IsDateString()
  detectedAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  publishedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  engagement?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  rawJson?: Record<string, unknown>;
}
