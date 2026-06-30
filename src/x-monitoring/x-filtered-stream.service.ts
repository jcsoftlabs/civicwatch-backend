import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class XFilteredStreamService {
  private readonly logger = new Logger(XFilteredStreamService.name);

  async startPlaceholder() {
    this.logger.debug('X filtered stream is not enabled in this phase.');
  }
}
