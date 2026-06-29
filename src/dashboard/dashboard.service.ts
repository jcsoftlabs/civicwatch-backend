import { Injectable } from '@nestjs/common';
import { Mention, Platform, Priority, Sentiment } from '@prisma/client';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alertsService: AlertsService,
  ) {}

  async getStats(organizationId: string) {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWindow = new Date(now);
    startOfWindow.setDate(startOfWindow.getDate() - 6);
    startOfWindow.setHours(0, 0, 0, 0);

    const [mentionsToday, allMentions, latestMentions, criticalAlerts] =
      await Promise.all([
        this.prisma.mention.findMany({
          where: {
            organizationId,
            detectedAt: { gte: startOfToday },
          },
        }),
        this.prisma.mention.findMany({
          where: { organizationId },
          orderBy: { detectedAt: 'desc' },
        }),
        this.prisma.mention.findMany({
          where: { organizationId },
          orderBy: { detectedAt: 'desc' },
          take: 5,
        }),
        this.alertsService.findCriticalAlerts(organizationId),
      ]);

    const criticalMentions = mentionsToday.filter(
      (mention) => mention.priority === Priority.CRITICAL,
    ).length;
    const negativeMentions = mentionsToday.filter(
      (mention) => mention.sentiment === Sentiment.NEGATIVE,
    ).length;
    const negativeSentimentPercentage = mentionsToday.length
      ? Math.round((negativeMentions / mentionsToday.length) * 100)
      : 0;

    const detectionDurations = allMentions
      .filter((mention) => mention.publishedAt)
      .map(
        (mention) =>
          (mention.detectedAt.getTime() - mention.publishedAt!.getTime()) / 1000,
      )
      .filter((seconds) => seconds >= 0);
    const averageDetectionTimeSeconds = detectionDurations.length
      ? Math.round(
          detectionDurations.reduce((sum, seconds) => sum + seconds, 0) /
            detectionDurations.length,
        )
      : 0;

    const mentionsLast7Days = this.buildMentionsLast7Days(
      allMentions.filter((mention) => mention.detectedAt >= startOfWindow),
      startOfWindow,
    );

    const platformDistribution = this.countByField(allMentions, 'platform');
    const sentimentDistribution = this.countByField(allMentions, 'sentiment');
    const topKeywords = this.buildTopKeywords(allMentions);

    return {
      totalMentionsToday: mentionsToday.length,
      criticalMentions,
      negativeSentimentPercentage,
      averageDetectionTimeSeconds,
      mentionsLast7Days,
      platformDistribution,
      sentimentDistribution,
      topKeywords,
      latestMentions,
      criticalAlerts,
    };
  }

  private buildMentionsLast7Days(mentions: Mention[], startOfWindow: Date) {
    return Array.from({ length: 7 }).map((_, index) => {
      const day = new Date(startOfWindow);
      day.setDate(startOfWindow.getDate() + index);
      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      return {
        date: day.toISOString().slice(0, 10),
        total: mentions.filter(
          (mention) => mention.detectedAt >= day && mention.detectedAt < nextDay,
        ).length,
      };
    });
  }

  private countByField<T extends Mention, K extends keyof T>(items: T[], field: K) {
    const counts = new Map<string, number>();
    items.forEach((item) => {
      const value = String(item[field]);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    });

    return Array.from(counts.entries()).map(([label, value]) => ({
      label,
      value,
    }));
  }

  private buildTopKeywords(mentions: Mention[]) {
    const counts = new Map<string, number>();
    mentions.forEach((mention) => {
      const keywords = Array.isArray(mention.matchedKeywords)
        ? (mention.matchedKeywords as string[])
        : [];
      keywords.forEach((keyword) => {
        counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword, count]) => ({ keyword, count }));
  }
}
