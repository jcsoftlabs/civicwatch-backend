import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebCrawlerService } from './web-crawler.service';

@Injectable()
export class CrawlSchedulerService {
  private readonly logger = new Logger(CrawlSchedulerService.name);

  constructor(private readonly webCrawlerService: WebCrawlerService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async processSources() {
    try {
      await this.webCrawlerService.processDueSources();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur scheduler crawler inconnue.';
      this.logger.error(`Scheduled crawl processing failed: ${message}`, error);
    }
  }
}
