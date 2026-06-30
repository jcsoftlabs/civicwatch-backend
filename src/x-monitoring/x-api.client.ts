import { Injectable, Logger } from '@nestjs/common';
import { XRecentSearchResponse } from './x-api.types';

interface RecentSearchOptions {
  query: string;
  bearerToken: string;
  sinceTime?: Date;
  maxResults?: number;
}

@Injectable()
export class XApiClient {
  private readonly logger = new Logger(XApiClient.name);
  private readonly baseUrl = 'https://api.x.com/2';
  private readonly timeoutMs = 10_000;
  private readonly maxRetries = 2;

  async recentSearch(options: RecentSearchOptions) {
    const url = new URL(`${this.baseUrl}/tweets/search/recent`);
    url.searchParams.set('query', options.query);
    url.searchParams.set(
      'tweet.fields',
      'author_id,created_at,public_metrics',
    );
    url.searchParams.set('expansions', 'author_id');
    url.searchParams.set('user.fields', 'name,username');
    url.searchParams.set(
      'max_results',
      String(Math.min(Math.max(options.maxResults ?? 25, 10), 100)),
    );

    if (options.sinceTime) {
      url.searchParams.set('start_time', options.sinceTime.toISOString());
    }

    return this.requestJson<XRecentSearchResponse>(url.toString(), options.bearerToken);
  }

  private async requestJson<T>(url: string, bearerToken: string): Promise<T> {
    let attempt = 0;
    let lastError: Error | undefined;

    while (attempt <= this.maxRetries) {
      attempt += 1;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              Accept: 'application/json',
            },
            signal: controller.signal,
          });

          if (!response.ok) {
            const payload = await response.text();
            const message = this.toHttpErrorMessage(response.status, payload);

            if (this.shouldRetry(response.status) && attempt <= this.maxRetries) {
              await this.waitBeforeRetry(attempt);
              continue;
            }

            throw new Error(message);
          }

          return (await response.json()) as T;
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erreur X API inconnue.');

        if (this.shouldRetryForError(lastError) && attempt <= this.maxRetries) {
          this.logger.warn(`Retrying X API request after temporary failure: ${lastError.message}`);
          await this.waitBeforeRetry(attempt);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError ?? new Error('Erreur X API inconnue.');
  }

  private toHttpErrorMessage(status: number, payload: string) {
    if (status === 401 || status === 403) {
      return `X API authorization failed (${status}).`;
    }

    if (status === 429) {
      return 'X API rate limit reached (429).';
    }

    return `X API request failed (${status}): ${payload.slice(0, 300)}`;
  }

  private shouldRetry(status: number) {
    return status === 429 || status >= 500;
  }

  private shouldRetryForError(error: Error) {
    return error.name === 'AbortError' || /fetch failed|network/i.test(error.message);
  }

  private async waitBeforeRetry(attempt: number) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 500));
  }
}
