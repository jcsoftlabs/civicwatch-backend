import { PartialType } from '@nestjs/swagger';
import { CreateMonitoredProfileDto } from './create-monitored-profile.dto';

export class UpdateMonitoredProfileDto extends PartialType(
  CreateMonitoredProfileDto,
) {}
