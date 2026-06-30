import * as bcrypt from 'bcrypt';
import {
  ApiConnectionPlatform,
  ApiConnectionStatus,
  AlertStatus,
  AlertType,
  KeywordType,
  MentionStatus,
  OrganizationRole,
  OrganizationType,
  Platform,
  PrismaClient,
  Priority,
  ProfileType,
  Sentiment,
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.alert.deleteMany();
  await prisma.report.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.crawledPage.deleteMany();
  await prisma.crawlSource.deleteMany();
  await prisma.xSearchRule.deleteMany();
  await prisma.apiConnection.deleteMany();
  await prisma.webNewsQuery.deleteMany();
  await prisma.searchProviderConnection.deleteMany();
  await prisma.rssSource.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.notificationChannel.deleteMany();
  await prisma.mention.deleteMany();
  await prisma.monitoredProfile.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.create({
    data: {
      fullName: 'CivicWatch Admin',
      email: 'admin@civicwatch.demo',
      passwordHash,
    },
  });

  const organization = await prisma.organization.create({
    data: {
      name: 'Fritz William Michel',
      slug: 'fritz-william-michel',
      type: OrganizationType.POLITICIAN,
      country: 'Haiti',
    },
  });

  await prisma.organizationMember.create({
    data: {
      userId: user.id,
      organizationId: organization.id,
      role: OrganizationRole.ORG_ADMIN,
    },
  });

  const monitoredProfile = await prisma.monitoredProfile.create({
    data: {
      organizationId: organization.id,
      displayName: 'Fritz William Michel',
      profileType: ProfileType.PERSON,
      description: 'Personnalité politique surveillée dans la démo CivicWatch.',
      country: 'Haiti',
      active: true,
    },
  });

  const keywordValues = [
    ['Fritz William Michel', KeywordType.NAME, Priority.CRITICAL],
    ['Fritz Michel', KeywordType.ALIAS, Priority.HIGH],
    ['FWM', KeywordType.ALIAS, Priority.MEDIUM],
    ['parti politique', KeywordType.PARTY, Priority.MEDIUM],
    ['entreprise', KeywordType.COMPANY, Priority.MEDIUM],
    ['scandale', KeywordType.SENSITIVE_TOPIC, Priority.CRITICAL],
    ['corruption', KeywordType.SENSITIVE_TOPIC, Priority.CRITICAL],
    ['gouvernance', KeywordType.SENSITIVE_TOPIC, Priority.HIGH],
  ] as const;

  await prisma.keyword.createMany({
    data: keywordValues.map(([keyword, keywordType, priority]) => ({
      organizationId: organization.id,
      monitoredProfileId: monitoredProfile.id,
      keyword,
      keywordType,
      priority,
      platforms: [Platform.X, Platform.FACEBOOK, Platform.INSTAGRAM, Platform.WEB, Platform.RSS, Platform.NEWS],
      active: true,
    })),
  });

  await prisma.keyword.updateMany({
    where: { organizationId: organization.id },
    data: {
      platforms: [
        Platform.X,
        Platform.FACEBOOK,
        Platform.INSTAGRAM,
        Platform.WEB,
        Platform.RSS,
        Platform.NEWS,
        Platform.CRAWLER,
      ],
    },
  });

  await prisma.notificationChannel.createMany({
    data: [
      {
        organizationId: organization.id,
        type: 'EMAIL',
        label: 'Email équipe communication',
        destination: 'alerts@civicwatch.demo',
        active: true,
      },
      {
        organizationId: organization.id,
        type: 'WHATSAPP',
        label: 'WhatsApp cellule crise',
        destination: '+50937000000',
        active: true,
      },
    ],
  });

  await prisma.rssSource.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Le Nouvelliste',
        feedUrl: 'https://example.com/rss/le-nouvelliste.xml',
        websiteUrl: 'https://lenouvelliste.com',
        active: false,
        checkIntervalMinutes: 15,
      },
      {
        organizationId: organization.id,
        name: 'Haiti Libre',
        feedUrl: 'https://example.com/rss/haiti-libre.xml',
        websiteUrl: 'https://haitilibre.com',
        active: false,
        checkIntervalMinutes: 15,
      },
      {
        organizationId: organization.id,
        name: 'AlterPresse',
        feedUrl: 'https://example.com/rss/alterpresse.xml',
        websiteUrl: 'https://www.alterpresse.org',
        active: false,
        checkIntervalMinutes: 30,
      },
      {
        organizationId: organization.id,
        name: 'Satellite 509',
        feedUrl: 'https://example.com/rss/satellite509.xml',
        websiteUrl: 'https://satellite509.com',
        active: false,
        checkIntervalMinutes: 30,
      },
    ],
  });

  await prisma.apiConnection.create({
    data: {
      organizationId: organization.id,
      platform: ApiConnectionPlatform.X,
      label: 'X API (à configurer)',
      status: ApiConnectionStatus.DISABLED,
      config: {
        recentSearchBaseUrl: 'https://api.x.com/2',
      },
    },
  });

  await prisma.xSearchRule.create({
    data: {
      organizationId: organization.id,
      name: 'Fritz William Michel mentions',
      query: '\"Fritz William Michel\" OR \"Fritz Michel\" OR \"FWM\" -is:retweet',
      active: false,
      checkIntervalMinutes: 5,
    },
  });

  await prisma.searchProviderConnection.createMany({
    data: [
      {
        organizationId: organization.id,
        provider: 'GDELT',
        label: 'GDELT Gratuit',
        active: true,
        baseUrl: 'https://api.gdeltproject.org/api/v2/doc/doc',
        config: {
          maxRecords: 10,
        },
      },
      {
        organizationId: organization.id,
        provider: 'NEWS_API',
        label: 'NewsAPI (optionnel)',
        active: false,
        baseUrl: 'https://newsapi.org/v2/everything',
        apiKeyEncrypted: null,
        config: {
          pageSize: 10,
        },
      },
    ],
  });

  await prisma.webNewsQuery.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Fritz William Michel',
        query: '\"Fritz William Michel\"',
        language: 'fr',
        country: 'HA',
        active: true,
        checkIntervalMinutes: 30,
      },
      {
        organizationId: organization.id,
        name: 'Fritz Michel',
        query: '\"Fritz Michel\"',
        language: 'fr',
        country: 'HA',
        active: true,
        checkIntervalMinutes: 30,
      },
      {
        organizationId: organization.id,
        name: 'FWM sujets sensibles',
        query: '\"Fritz William Michel\" corruption scandale gouvernance',
        language: 'fr',
        country: 'HA',
        active: true,
        checkIntervalMinutes: 45,
      },
    ],
  });

  await prisma.crawlSource.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Medias locaux',
        baseUrl: 'https://lenouvelliste.com',
        startUrls: ['https://lenouvelliste.com', 'https://satellite509.com'],
        allowedDomains: ['lenouvelliste.com', 'satellite509.com'],
        active: false,
        respectRobotsTxt: true,
        checkIntervalMinutes: 60,
        maxPagesPerRun: 20,
      },
      {
        organizationId: organization.id,
        name: 'Sites institutionnels',
        baseUrl: 'https://www.haitilibre.com',
        startUrls: ['https://www.haitilibre.com'],
        allowedDomains: ['www.haitilibre.com', 'haitilibre.com'],
        active: false,
        respectRobotsTxt: true,
        checkIntervalMinutes: 60,
        maxPagesPerRun: 20,
      },
      {
        organizationId: organization.id,
        name: 'Blogs politiques',
        baseUrl: 'https://www.alterpresse.org',
        startUrls: ['https://www.alterpresse.org'],
        allowedDomains: ['www.alterpresse.org', 'alterpresse.org'],
        active: false,
        respectRobotsTxt: true,
        checkIntervalMinutes: 90,
        maxPagesPerRun: 15,
      },
      {
        organizationId: organization.id,
        name: 'AyiboPost',
        baseUrl: 'https://ayibopost.com',
        startUrls: ['https://ayibopost.com'],
        allowedDomains: ['ayibopost.com'],
        active: false,
        respectRobotsTxt: true,
        checkIntervalMinutes: 90,
        maxPagesPerRun: 15,
      },
      {
        organizationId: organization.id,
        name: 'Radio Tele Metropole',
        baseUrl: 'https://metropole.ht',
        startUrls: ['https://metropole.ht'],
        allowedDomains: ['metropole.ht'],
        active: false,
        respectRobotsTxt: true,
        checkIntervalMinutes: 90,
        maxPagesPerRun: 15,
      },
    ],
  });

  const sources = [
    { platform: Platform.X, sourceName: 'X / Twitter' },
    { platform: Platform.FACEBOOK, sourceName: 'Facebook Public Posts' },
    { platform: Platform.INSTAGRAM, sourceName: 'Instagram / Reels Watch' },
    { platform: Platform.WEB, sourceName: 'Web Articles' },
    { platform: Platform.RSS, sourceName: 'RSS Feed Network' },
    { platform: Platform.NEWS, sourceName: 'Online News Media' },
  ];

  const contents = [
    'Fritz William Michel doit clarifier sa position sur un dossier de gouvernance.',
    'Des observateurs relaient une discussion sensible autour de Fritz Michel et de son entourage.',
    'Le nom FWM circule rapidement dans plusieurs commentaires publics liés à la campagne.',
    'Une publication mentionne un possible scandale autour de décisions économiques récentes.',
    'Le mot-clé corruption réapparaît dans plusieurs réactions citoyennes en ligne.',
    'Plusieurs articles évoquent la gouvernance et la stratégie médiatique de Fritz William Michel.',
    'Une vidéo Instagram relance une conversation sur un parti politique et son influence.',
    'Des internautes associent entreprise et communication politique dans une même discussion.',
    'Un billet d’actualité souligne une prise de parole jugée constructive par certains soutiens.',
    'Des messages mixtes émergent après une intervention publique de Fritz Michel.',
  ];

  const mentionsData = Array.from({ length: 30 }).map((_, index) => {
    const source = sources[index % sources.length];
    const content = contents[index % contents.length];
    const now = new Date();
    const publishedAt = new Date(now.getTime() - (index + 2) * 60 * 60 * 1000);
    const detectedAt = new Date(publishedAt.getTime() + ((index % 9) + 1) * 45 * 1000);
    const keyword = keywordValues[index % keywordValues.length][0];
    const sentiment =
      index % 5 === 0 ? Sentiment.POSITIVE : index % 2 === 0 ? Sentiment.NEGATIVE : Sentiment.NEUTRAL;
    const priority =
      index % 7 === 0
        ? Priority.CRITICAL
        : index % 4 === 0
          ? Priority.HIGH
          : index % 3 === 0
            ? Priority.MEDIUM
            : Priority.LOW;

    return {
      organizationId: organization.id,
      monitoredProfileId: monitoredProfile.id,
      platform: source.platform,
      sourceName: source.sourceName,
      externalId: `ext-${index + 1}`,
      authorName: `Source Author ${index + 1}`,
      authorHandle: `author_${index + 1}`,
      title: index % 2 === 0 ? `Headline ${index + 1}` : null,
      content,
      url: `https://example.org/source/${index + 1}`,
      matchedKeywords: [keyword, 'Fritz William Michel'],
      sentiment,
      priority,
      status:
        index % 6 === 0
          ? MentionStatus.REVIEWING
          : index % 8 === 0
            ? MentionStatus.RESOLVED
            : MentionStatus.NEW,
      detectedAt,
      publishedAt,
      engagement: {
        likes: 25 + index * 7,
        comments: 5 + index * 3,
        shares: 2 + index,
      },
      rawJson: {
        connector: 'seed',
        confidence: 0.84,
        batch: 'phase-1',
      },
    };
  });

  for (const mention of mentionsData) {
    await prisma.mention.create({ data: mention });
  }

  const mentions = await prisma.mention.findMany({
    where: { organizationId: organization.id },
    orderBy: { detectedAt: 'desc' },
  });

  const alertTypes = [
    AlertType.EMAIL,
    AlertType.SMS,
    AlertType.WHATSAPP,
    AlertType.TELEGRAM,
    AlertType.IN_APP,
  ];

  for (let index = 0; index < 10; index += 1) {
    const mention = mentions[index];
    await prisma.alert.create({
      data: {
        organizationId: organization.id,
        mentionId: mention.id,
        alertType: alertTypes[index % alertTypes.length],
        severity:
          index % 4 === 0
            ? Priority.CRITICAL
            : index % 3 === 0
              ? Priority.HIGH
              : Priority.MEDIUM,
        title: `Alerte ${index + 1} pour ${mention.platform}`,
        message: `Signal détecté sur ${mention.sourceName}: ${mention.content.slice(0, 120)}`,
        status:
          index % 5 === 0
            ? AlertStatus.ACKNOWLEDGED
            : index % 2 === 0
              ? AlertStatus.SENT
              : AlertStatus.PENDING,
        sentAt: new Date(mention.detectedAt.getTime() + 30 * 1000),
        acknowledgedAt:
          index % 5 === 0 ? new Date(mention.detectedAt.getTime() + 5 * 60 * 1000) : null,
      },
    });
  }

  await prisma.report.createMany({
    data: [
      {
        organizationId: organization.id,
        title: 'Rapport hebdomadaire - Semaine 1',
        periodStart: new Date('2026-06-01T00:00:00.000Z'),
        periodEnd: new Date('2026-06-07T23:59:59.000Z'),
        summary:
          'La semaine 1 montre une hausse progressive des mentions sensibles autour de la gouvernance et de la transparence.',
        metrics: {
          totalMentions: 18,
          negativeMentions: 7,
          criticalAlerts: 3,
        },
        recommendations: [
          'Préparer un point de langage sur la gouvernance.',
          'Surveiller les hashtags émergents sur X.',
        ],
      },
      {
        organizationId: organization.id,
        title: 'Rapport hebdomadaire - Semaine 2',
        periodStart: new Date('2026-06-08T00:00:00.000Z'),
        periodEnd: new Date('2026-06-14T23:59:59.000Z'),
        summary:
          'La semaine 2 confirme une polarisation accrue du discours public avec un focus sur corruption et scandale.',
        metrics: {
          totalMentions: 24,
          negativeMentions: 11,
          criticalAlerts: 4,
        },
        recommendations: [
          'Répondre plus vite aux signaux critiques.',
          'Documenter les sources médias à forte reprise.',
        ],
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: user.id,
        action: 'seed.initialized',
        entityType: 'System',
        entityId: organization.id,
        metadata: { phase: 1, actor: 'seed' },
      },
      {
        organizationId: organization.id,
        userId: user.id,
        action: 'organization.created',
        entityType: 'Organization',
        entityId: organization.id,
        metadata: { name: organization.name },
      },
      {
        organizationId: organization.id,
        userId: user.id,
        action: 'profile.created',
        entityType: 'MonitoredProfile',
        entityId: monitoredProfile.id,
        metadata: { displayName: monitoredProfile.displayName },
      },
      {
        organizationId: organization.id,
        userId: user.id,
        action: 'mentions.imported',
        entityType: 'Mention',
        metadata: { total: mentions.length },
      },
    ],
  });

  console.log('Seed completed successfully.');
  console.log({
    adminEmail: user.email,
    adminPassword: 'Password123!',
    organization: organization.name,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
