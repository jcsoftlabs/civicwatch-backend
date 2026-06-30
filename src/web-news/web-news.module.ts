import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { EncryptionService } from '../common/services/encryption.service';
import { KeywordMatcherService } from '../common/services/keyword-matcher.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BraveSearchProvider } from './providers/brave-search.provider';
import { GdeltProvider } from './providers/gdelt.provider';
import { NewsApiProvider } from './providers/news-api.provider';
import { SerpApiProvider } from './providers/serp-api.provider';
import { WebNewsController } from './web-news.controller';
import { WebNewsService } from './web-news.service';
import { WebNewsWorker } from './web-news.worker';

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [WebNewsController],
  providers: [
    WebNewsService,
    WebNewsWorker,
    GdeltProvider,
    NewsApiProvider,
    BraveSearchProvider,
    SerpApiProvider,
    KeywordMatcherService,
    EncryptionService,
  ],
  exports: [WebNewsService],
})
export class WebNewsModule {}
