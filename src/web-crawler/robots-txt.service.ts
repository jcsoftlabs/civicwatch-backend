import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import robotsParser from 'robots-parser';

@Injectable()
export class RobotsTxtService {
  private readonly logger = new Logger(RobotsTxtService.name);
  private readonly cache = new Map<string, ReturnType<typeof robotsParser>>();

  constructor(private readonly configService: ConfigService) {}

  async isAllowed(targetUrl: string, userAgent: string): Promise<boolean> {
    const url = new URL(targetUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const parser = await this.getParser(robotsUrl);

    if (!parser) {
      return true;
    }

    const allowed = parser.isAllowed(targetUrl, userAgent);
    if (allowed) {
      return true;
    }

    if (this.configService.get<string>('CRAWLER_ALLOW_ROBOTS_OVERRIDE') === 'true') {
      this.logger.warn(`robots.txt override enabled for ${targetUrl}`);
      return true;
    }

    return false;
  }

  private async getParser(robotsUrl: string) {
    const cached = this.cache.get(robotsUrl);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': this.getUserAgent() },
      });

      if (!response.ok) {
        this.logger.warn(`robots.txt unavailable at ${robotsUrl}: ${response.status}`);
        return null;
      }

      const content = await response.text();
      const parser = robotsParser(robotsUrl, content);
      this.cache.set(robotsUrl, parser);
      return parser;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown robots.txt error';
      this.logger.warn(`robots.txt fetch failed for ${robotsUrl}: ${message}`);
      return null;
    }
  }

  private getUserAgent() {
    return this.configService.get<string>(
      'CRAWLER_USER_AGENT',
      'CivicWatchBot/1.0 (+contact configured by organization)',
    );
  }
}
