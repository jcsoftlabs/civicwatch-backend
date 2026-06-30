import { Injectable } from '@nestjs/common';
import { Keyword, KeywordType, Platform, Priority } from '@prisma/client';

export interface KeywordMatchResult {
  matchedKeywords: string[];
  highestPriority: Priority;
  monitoredProfileId?: string;
}

interface MatchOptions {
  requireIdentityAnchor?: boolean;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const IDENTITY_KEYWORD_TYPES = new Set<KeywordType>([
  KeywordType.NAME,
  KeywordType.ALIAS,
  KeywordType.COMPANY,
  KeywordType.PARTY,
  KeywordType.HASHTAG,
]);

@Injectable()
export class KeywordMatcherService {
  match(
    content: string,
    keywords: Keyword[],
    platform?: Platform,
    options: MatchOptions = {},
  ): KeywordMatchResult | null {
    const normalizedContent = content.toLowerCase();
    const matches = keywords.filter((keyword) => {
      if (!keyword.active) {
        return false;
      }

      const supportedPlatforms = Array.isArray(keyword.platforms)
        ? (keyword.platforms as string[])
        : [];

      if (platform && supportedPlatforms.length > 0 && !supportedPlatforms.includes(platform)) {
        return false;
      }

      return normalizedContent.includes(keyword.keyword.toLowerCase());
    });

    if (matches.length === 0) {
      return null;
    }

    if (options.requireIdentityAnchor) {
      const hasIdentityAnchor = matches.some((keyword) =>
        IDENTITY_KEYWORD_TYPES.has(keyword.keywordType),
      );

      if (!hasIdentityAnchor) {
        return null;
      }
    }

    const highestPriorityKeyword = matches.reduce((highest, current) =>
      PRIORITY_ORDER[current.priority] > PRIORITY_ORDER[highest.priority] ? current : highest,
    );

    return {
      matchedKeywords: [...new Set(matches.map((keyword) => keyword.keyword))],
      highestPriority: highestPriorityKeyword.priority,
      monitoredProfileId: highestPriorityKeyword.monitoredProfileId ?? undefined,
    };
  }
}
