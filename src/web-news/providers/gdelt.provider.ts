import { Injectable, Logger } from '@nestjs/common';
import { Platform, SearchProvider } from '@prisma/client';
import {
  WebNewsProvider,
  WebNewsSearchOptions,
} from './web-news-provider.interface';
import { NormalizedWebNewsResult } from '../types/normalized-web-news-result.type';

interface GdeltArticle {
  url?: string;
  url_mobile?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

@Injectable()
export class GdeltProvider implements WebNewsProvider {
  readonly provider = SearchProvider.GDELT;
  private readonly logger = new Logger(GdeltProvider.name);

  async search(
    query: string,
    options: WebNewsSearchOptions,
  ): Promise<NormalizedWebNewsResult[]> {
    const baseUrl = options.baseUrl ?? 'https://api.gdeltproject.org/api/v2/doc/doc';
    const url = new URL(baseUrl);

    url.searchParams.set('query', query);
    url.searchParams.set('mode', 'ArtList');
    url.searchParams.set('format', 'json');
    url.searchParams.set('maxrecords', String(options.config?.maxRecords ?? 25));
    url.searchParams.set('sort', 'DateDesc');

    if (options.language) {
      url.searchParams.set('sourcelang', options.language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`GDELT a retourne ${response.status}.`);
      }

      const payload = (await response.json()) as GdeltResponse;

      return (payload.articles ?? [])
        .filter((article) => article.url || article.url_mobile)
        .map<NormalizedWebNewsResult>((article) => ({
          externalId: article.url ?? article.url_mobile,
          sourceName: article.domain ?? 'GDELT',
          title: article.title ?? query,
          url: article.url ?? article.url_mobile ?? '',
          summary: article.title ?? query,
          publishedAt: article.seendate ? new Date(article.seendate) : undefined,
          language: article.language ?? options.language,
          country: article.sourcecountry ?? options.country,
          platform: Platform.NEWS,
          rawJson: article as Record<string, unknown>,
        }))
        .filter((article) => Boolean(article.url));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur GDELT inconnue.';
      this.logger.warn(`GDELT search failed for query "${query}": ${message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
