import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider } from '@prisma/client';
import {
  WebNewsProvider,
  WebNewsSearchOptions,
} from './web-news-provider.interface';
import { NormalizedWebNewsResult } from '../types/normalized-web-news-result.type';

@Injectable()
export class BraveSearchProvider implements WebNewsProvider {
  readonly provider = SearchProvider.BRAVE_SEARCH;
  private readonly logger = new Logger(BraveSearchProvider.name);

  async search(
    query: string,
    _options: WebNewsSearchOptions,
  ): Promise<NormalizedWebNewsResult[]> {
    this.logger.debug(`Brave Search provider placeholder invoked for query "${query}".`);
    return [];
  }
}
