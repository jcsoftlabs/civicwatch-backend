import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { XMonitoringService } from './x-monitoring.service';

@Injectable()
export class XRecentSearchWorker {
  private readonly logger = new Logger(XRecentSearchWorker.name);

  constructor(private readonly xMonitoringService: XMonitoringService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processRules() {
    try {
      await this.xMonitoringService.processDueRules();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur planificateur X Recent Search inconnue.';
      this.logger.error(`Scheduled X processing failed: ${message}`, error);
    }
  }
}
