import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface ExtractedHtmlPage {
  title?: string;
  metaDescription?: string;
  textContent: string;
  internalLinks: string[];
}

@Injectable()
export class HtmlExtractorService {
  extract(html: string, pageUrl: string, allowedDomains: string[]): ExtractedHtmlPage {
    const $ = cheerio.load(html);

    $('script, style, noscript, iframe, svg').remove();

    const title = $('title').first().text().trim() || undefined;
    const metaDescription =
      $('meta[name="description"]').attr('content')?.trim() || undefined;

    const textRoot = $('main').text().trim() || $('article').text().trim() || $('body').text().trim();
    const textContent = textRoot.replace(/\s+/g, ' ').trim();

    const internalLinks = new Set<string>();
    $('a[href]').each((_, element) => {
      const href = $(element).attr('href');
      if (!href) {
        return;
      }

      try {
        const absoluteUrl = new URL(href, pageUrl);
        if (!['http:', 'https:'].includes(absoluteUrl.protocol)) {
          return;
        }

        if (this.isAllowedDomain(absoluteUrl.hostname, allowedDomains)) {
          internalLinks.add(absoluteUrl.toString());
        }
      } catch {
        return;
      }
    });

    return {
      title,
      metaDescription,
      textContent,
      internalLinks: [...internalLinks],
    };
  }

  private isAllowedDomain(hostname: string, allowedDomains: string[]) {
    return allowedDomains.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`),
    );
  }
}
