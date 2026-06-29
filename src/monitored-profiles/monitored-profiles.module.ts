import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { MonitoredProfilesController } from './monitored-profiles.controller';
import { MonitoredProfilesService } from './monitored-profiles.service';

@Module({
  imports: [AuditLogsModule],
  controllers: [MonitoredProfilesController],
  providers: [MonitoredProfilesService],
})
export class MonitoredProfilesModule {}
