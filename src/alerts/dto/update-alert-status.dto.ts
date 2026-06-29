import { ApiProperty } from '@nestjs/swagger';
import { AlertStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateAlertStatusDto {
  @ApiProperty({ enum: AlertStatus })
  @IsEnum(AlertStatus)
  status!: AlertStatus;
}
