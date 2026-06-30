import { Platform } from '@prisma/client';

export interface NormalizedWebNewsResult {
  externalId?: string;
  sourceName: string;
  title: string;
  url: string;
  summary: string;
  publishedAt?: Date;
  author?: string;
  language?: string;
  country?: string;
  platform: Platform;
  rawJson: Record<string, unknown>;
}
