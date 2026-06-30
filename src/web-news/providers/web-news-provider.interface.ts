import { SearchProvider } from '@prisma/client';
import { NormalizedWebNewsResult } from '../types/normalized-web-news-result.type';

export interface WebNewsSearchOptions {
  language?: string;
  country?: string;
  apiKey?: string;
  baseUrl?: string;
  config?: Record<string, unknown>;
}

export interface WebNewsProvider {
  readonly provider: SearchProvider;
  search(query: string, options: WebNewsSearchOptions): Promise<NormalizedWebNewsResult[]>;
}
