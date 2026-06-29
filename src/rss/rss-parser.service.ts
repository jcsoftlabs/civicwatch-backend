import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';

export interface ParsedRssItem {
  externalId?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  url?: string;
  publishedAt?: Date;
  raw: Record<string, unknown>;
}

@Injectable()
export class RssParserService {
  private readonly parser = new Parser<Record<string, never>, Record<string, unknown>>();

  async parse(feedUrl: string): Promise<ParsedRssItem[]> {
    const feed = await this.parser.parseURL(feedUrl);

    return (feed.items ?? []).map((item) => {
      const raw = item as Record<string, unknown>;
      const content = this.asString(
        raw['content:encoded'] ?? raw.content ?? raw.summary ?? raw['contentSnippet'],
      );
      const excerpt = this.asString(raw.contentSnippet ?? raw.summary);
      const url = this.asString(raw.link);
      const guid = this.asString(raw.guid ?? raw.id);
      const publishedAtValue =
        this.asString(raw.isoDate) ?? this.asString(raw.pubDate) ?? this.asString(raw.published);

      return {
        externalId: guid ?? url ?? undefined,
        title: this.asString(raw.title),
        content,
        excerpt,
        url,
        publishedAt: publishedAtValue ? new Date(publishedAtValue) : undefined,
        raw,
      };
    });
  }

  private asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
  }
}
