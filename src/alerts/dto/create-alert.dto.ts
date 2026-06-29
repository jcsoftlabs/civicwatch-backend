import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertStatus, AlertType, Priority } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAlertDto {
  @ApiProperty()
  @IsString()
  mentionId!: string;

  @ApiProperty({ enum: AlertType })
  @IsEnum(AlertType)
  alertType!: AlertType;

  @ApiProperty({ enum: Priority })
  @IsEnum(Priority)
  severity!: Priority;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ enum: AlertStatus })
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sentAt?: string;
}
