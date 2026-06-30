import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebNewsService } from './web-news.service';

@Injectable()
export class WebNewsWorker {
  private readonly logger = new Logger(WebNewsWorker.name);

  constructor(private readonly webNewsService: WebNewsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processQueries() {
    try {
      await this.webNewsService.processDueQueries();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur planificateur Web/News inconnue.';
      this.logger.error(`Scheduled Web/News processing failed: ${message}`, error);
    }
  }
}
