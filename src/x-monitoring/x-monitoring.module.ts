import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EncryptionService } from '../common/services/encryption.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { XApiClient } from './x-api.client';
import { XFilteredStreamService } from './x-filtered-stream.service';
import { XMonitoringController } from './x-monitoring.controller';
import { XMonitoringService } from './x-monitoring.service';
import { XNormalizerService } from './x-normalizer.service';
import { XRecentSearchWorker } from './x-recent-search.worker';
import { XRulesBuilderService } from './x-rules-builder.service';
import { XStreamRulesService } from './x-stream-rules.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [XMonitoringController],
  providers: [
    XMonitoringService,
    XApiClient,
    XRecentSearchWorker,
    XRulesBuilderService,
    XNormalizerService,
    XFilteredStreamService,
    XStreamRulesService,
    KeywordMatcherService,
    EncryptionService,
  ],
  exports: [XMonitoringService, XRulesBuilderService],
})
export class XMonitoringModule {}
