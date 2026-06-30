import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class XStreamRulesService {
  private readonly logger = new Logger(XStreamRulesService.name);

  async syncPlaceholder() {
    this.logger.debug('X stream rules sync is not enabled in this phase.');
  }
}
