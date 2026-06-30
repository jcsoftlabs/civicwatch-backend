import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class CheckNowDto {
  @ApiPropertyOptional({ default: 25, minimum: 10, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  maxResults?: number;
}
