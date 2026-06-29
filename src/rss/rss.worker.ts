import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RssService } from './rss.service';

@Injectable()
export class RssWorker {
  private readonly logger = new Logger(RssWorker.name);

  constructor(private readonly rssService: RssService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processFeeds() {
    try {
      await this.rssService.processDueSources();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur planificateur RSS inconnue.';
      this.logger.error(`Scheduled RSS processing failed: ${message}`, error);
    }
  }
}
