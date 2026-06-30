import { Injectable } from '@nestjs/common';
import { MentionStatus, Platform, Prisma, Sentiment, XSearchRule } from '@prisma/client';
import { KeywordMatchResult } from '../common/services/keyword-matcher.service';
import { XApiPost, XApiUser } from './x-api.types';

@Injectable()
export class XNormalizerService {
  normalizeMentionInput(params: {
    organizationId: string;
    post: XApiPost;
    author?: XApiUser;
    match: KeywordMatchResult;
    rule: XSearchRule;
  }): Prisma.MentionUncheckedCreateInput {
    const { organizationId, post, author, match, rule } = params;

    const mentionInput: Prisma.MentionUncheckedCreateInput = {
      organizationId,
      monitoredProfileId: match.monitoredProfileId,
      platform: Platform.X,
      sourceName: `X Recent Search: ${rule.name}`,
      externalId: post.id,
      authorName: author?.name ?? null,
      authorHandle: author?.username ?? null,
      content: post.text,
      url: this.buildPostUrl(post.id, author),
      matchedKeywords: match.matchedKeywords,
      sentiment: Sentiment.UNKNOWN,
      priority: match.highestPriority,
      status: MentionStatus.NEW,
      detectedAt: new Date(),
      publishedAt: post.created_at ? new Date(post.created_at) : undefined,
      rawJson: post as unknown as Prisma.InputJsonValue,
    };

    if (post.public_metrics) {
      mentionInput.engagement = post.public_metrics as Prisma.InputJsonValue;
    }

    return mentionInput;
  }

  private buildPostUrl(postId: string, author?: XApiUser) {
    if (author?.username) {
      return `https://x.com/${author.username}/status/${postId}`;
    }

    if (author?.id) {
      return `https://x.com/i/user/${author.id}/status/${postId}`;
    }

    return `https://x.com/i/web/status/${postId}`;
  }
}
