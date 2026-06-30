import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

@Injectable()
export class CrawlNormalizerService {
  hashContent(content: string) {
    return createHash('sha256').update(content).digest('hex');
  }

  buildExcerpt(content: string, matchedKeywords: string[]) {
    const normalizedContent = content.replace(/\s+/g, ' ').trim();
    if (!normalizedContent) {
      return '';
    }

    const lowerContent = normalizedContent.toLowerCase();
    const keyword = matchedKeywords.find((item) =>
      lowerContent.includes(item.toLowerCase()),
    );

    if (!keyword) {
      return normalizedContent.slice(0, 500);
    }

    const startIndex = Math.max(0, lowerContent.indexOf(keyword.toLowerCase()) - 120);
    const excerpt = normalizedContent.slice(startIndex, startIndex + 500);
    return excerpt;
  }
}
