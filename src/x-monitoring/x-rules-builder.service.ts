import { Injectable } from '@nestjs/common';
import { Keyword, KeywordType } from '@prisma/client';

interface BuildQueryOptions {
  excludeRetweets?: boolean;
  language?: string;
}

@Injectable()
export class XRulesBuilderService {
  private readonly supportedKeywordTypes = new Set<KeywordType>([
    KeywordType.NAME,
    KeywordType.ALIAS,
    KeywordType.HASHTAG,
    KeywordType.COMPANY,
    KeywordType.PARTY,
  ]);

  buildFromKeywords(keywords: Keyword[], options: BuildQueryOptions = {}) {
    const clauses = keywords
      .filter((keyword) => keyword.active)
      .filter((keyword) => this.supportedKeywordTypes.has(keyword.keywordType))
      .map((keyword) => this.formatKeyword(keyword))
      .filter(Boolean);

    const uniqueClauses = [...new Set(clauses)];
    const queryParts: string[] = [];

    if (uniqueClauses.length > 0) {
      queryParts.push(uniqueClauses.join(' OR '));
    }

    if (options.excludeRetweets ?? true) {
      queryParts.push('-is:retweet');
    }

    if (options.language) {
      queryParts.push(`lang:${options.language}`);
    }

    return queryParts.join(' ').trim();
  }

  private formatKeyword(keyword: Keyword) {
    const value = keyword.keyword.trim();
    if (!value) {
      return '';
    }

    if (keyword.keywordType === KeywordType.HASHTAG) {
      return value.startsWith('#') ? value : `#${value}`;
    }

    return `"${value.replace(/"/g, '\\"')}"`;
  }
}
