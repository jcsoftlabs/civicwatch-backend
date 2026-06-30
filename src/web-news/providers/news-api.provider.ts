import { Injectable, Logger } from '@nestjs/common';
import { Platform, SearchProvider } from '@prisma/client';
import {
  WebNewsProvider,
  WebNewsSearchOptions,
} from './web-news-provider.interface';
import { NormalizedWebNewsResult } from '../types/normalized-web-news-result.type';

interface NewsApiArticle {
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  publishedAt?: string | null;
  source?: {
    name?: string | null;
  };
}

interface NewsApiResponse {
  articles?: NewsApiArticle[];
}

@Injectable()
export class NewsApiProvider implements WebNewsProvider {
  readonly provider = SearchProvider.NEWS_API;
  private readonly logger = new Logger(NewsApiProvider.name);

  async search(
    query: string,
    options: WebNewsSearchOptions,
  ): Promise<NormalizedWebNewsResult[]> {
    const apiKey = options.apiKey;
    if (!apiKey) {
      this.logger.warn('NewsAPI is configured without api key; skipping query.');
      return [];
    }

    const baseUrl = options.baseUrl ?? 'https://newsapi.org/v2/everything';
    const url = new URL(baseUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('pageSize', String(options.config?.pageSize ?? 25));
    url.searchParams.set('sortBy', 'publishedAt');
    if (options.language) {
      url.searchParams.set('language', options.language);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'X-Api-Key': apiKey,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`NewsAPI a retourne ${response.status}.`);
      }

      const payload = (await response.json()) as NewsApiResponse;
      return (payload.articles ?? [])
        .filter((article) => article.url && article.title)
        .map((article) => ({
          externalId: article.url ?? undefined,
          sourceName: article.source?.name ?? 'NewsAPI',
          title: article.title ?? query,
          url: article.url ?? '',
          summary: article.description ?? article.title ?? query,
          publishedAt: article.publishedAt ? new Date(article.publishedAt) : undefined,
          author: article.author ?? undefined,
          language: options.language,
          country: options.country,
          platform: Platform.NEWS,
          rawJson: article as Record<string, unknown>,
        }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur NewsAPI inconnue.';
      this.logger.warn(`NewsAPI search failed for query "${query}": ${message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
