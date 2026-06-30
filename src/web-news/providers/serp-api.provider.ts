import { Injectable, Logger } from '@nestjs/common';
import { SearchProvider } from '@prisma/client';
import {
  WebNewsProvider,
  WebNewsSearchOptions,
} from './web-news-provider.interface';
import { NormalizedWebNewsResult } from '../types/normalized-web-news-result.type';

@Injectable()
export class SerpApiProvider implements WebNewsProvider {
  readonly provider = SearchProvider.SERP_API;
  private readonly logger = new Logger(SerpApiProvider.name);

  async search(
    query: string,
    _options: WebNewsSearchOptions,
  ): Promise<NormalizedWebNewsResult[]> {
    this.logger.debug(`SerpAPI provider placeholder invoked for query "${query}".`);
    return [];
  }
}
