import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RssController } from './rss.controller';
import { RssParserService } from './rss-parser.service';
import { RssService } from './rss.service';
import { RssWorker } from './rss.worker';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [RssController],
  providers: [RssService, RssParserService, RssWorker, KeywordMatcherService],
  exports: [RssService],
})
export class RssModule {}
