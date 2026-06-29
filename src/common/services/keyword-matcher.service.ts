import { Injectable } from '@nestjs/common';
import { Keyword, Platform, Priority } from '@prisma/client';

export interface KeywordMatchResult {
  matchedKeywords: string[];
  highestPriority: Priority;
  monitoredProfileId?: string;
}

const PRIORITY_ORDER: Record<Priority, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

@Injectable()
export class KeywordMatcherService {
  match(content: string, keywords: Keyword[], platform?: Platform): KeywordMatchResult | null {
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
