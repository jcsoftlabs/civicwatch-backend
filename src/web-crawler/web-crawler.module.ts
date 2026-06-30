import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CrawlNormalizerService } from './crawl-normalizer.service';
import { CrawlSchedulerService } from './crawl-scheduler.service';
import { HtmlExtractorService } from './html-extractor.service';
import { RobotsTxtService } from './robots-txt.service';
import { WebCrawlerController } from './web-crawler.controller';
import { WebCrawlerService } from './web-crawler.service';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [WebCrawlerController],
  providers: [
    WebCrawlerService,
    RobotsTxtService,
    HtmlExtractorService,
    CrawlNormalizerService,
    CrawlSchedulerService,
    KeywordMatcherService,
  ],
  exports: [WebCrawlerService],
})
export class WebCrawlerModule {}
