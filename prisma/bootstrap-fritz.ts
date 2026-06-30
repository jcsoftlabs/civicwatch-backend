import * as bcrypt from 'bcrypt';
import {
  KeywordType,
  NotificationChannelType,
  OrganizationRole,
  OrganizationType,
  Platform,
  PrismaClient,
  Priority,
  ProfileType,
  SearchProvider,
  UserStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalCsv(name: string, fallback: string[]) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function main() {
  const adminEmail = requiredEnv('FRITZ_ADMIN_EMAIL').toLowerCase();
  const adminPassword = requiredEnv('FRITZ_ADMIN_PASSWORD');
  const fullName = process.env.FRITZ_FULL_NAME ?? 'Fritz William Michel';
  const organizationName = process.env.FRITZ_ORGANIZATION_NAME ?? 'Fritz William Michel';
  const organizationSlug = process.env.FRITZ_ORGANIZATION_SLUG ?? 'fritz-william-michel';
  const country = process.env.FRITZ_COUNTRY ?? 'Haiti';
  const nickname = process.env.FRITZ_NICKNAME ?? 'Neg Kabrit Lan';
  const companies = optionalCsv('FRITZ_COMPANIES', [
    'FWM Holding',
    'FWM Ventures',
  ]);
  const alertEmail = process.env.FRITZ_ALERT_EMAIL ?? adminEmail;
  const alertWhatsapp = process.env.FRITZ_ALERT_WHATSAPP ?? '+50900000000';

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      fullName,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
    create: {
      fullName,
      email: adminEmail,
      passwordHash,
      status: UserStatus.ACTIVE,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: organizationSlug },
    update: {
      name: organizationName,
      type: OrganizationType.POLITICIAN,
      country,
    },
    create: {
      name: organizationName,
      slug: organizationSlug,
      type: OrganizationType.POLITICIAN,
      country,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: organization.id,
      },
    },
    update: {
      role: OrganizationRole.ORG_ADMIN,
    },
    create: {
      userId: user.id,
      organizationId: organization.id,
      role: OrganizationRole.ORG_ADMIN,
    },
  });

  const personProfile = await prisma.monitoredProfile.upsert({
    where: {
      id: `${organization.id}-person-profile`,
    },
    update: {
      displayName: fullName,
      profileType: ProfileType.PERSON,
      description: 'Personnalite politique et entrepreneur haitien surveille par CivicWatch.',
      country,
      active: true,
      organizationId: organization.id,
    },
    create: {
      id: `${organization.id}-person-profile`,
      organizationId: organization.id,
      displayName: fullName,
      profileType: ProfileType.PERSON,
      description: 'Personnalite politique et entrepreneur haitien surveille par CivicWatch.',
      country,
      active: true,
    },
  });

  for (const company of companies) {
    await prisma.monitoredProfile.upsert({
      where: {
        id: `${organization.id}-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      },
      update: {
        displayName: company,
        profileType: ProfileType.COMPANY,
        description: `Entreprise rattachee a ${fullName}.`,
        country,
        active: true,
        organizationId: organization.id,
      },
      create: {
        id: `${organization.id}-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        organizationId: organization.id,
        displayName: company,
        profileType: ProfileType.COMPANY,
        description: `Entreprise rattachee a ${fullName}.`,
        country,
        active: true,
      },
    });
  }

  const basePlatforms = [
    Platform.X,
    Platform.FACEBOOK,
    Platform.INSTAGRAM,
    Platform.WEB,
    Platform.RSS,
    Platform.NEWS,
    Platform.CRAWLER,
  ];

  const personKeywords: Array<[string, KeywordType, Priority]> = [
    ['Fritz William Michel', KeywordType.NAME, Priority.CRITICAL],
    ['Fritz Michel', KeywordType.ALIAS, Priority.HIGH],
    ['FWM', KeywordType.ALIAS, Priority.MEDIUM],
    [nickname, KeywordType.ALIAS, Priority.HIGH],
    ['corruption', KeywordType.SENSITIVE_TOPIC, Priority.CRITICAL],
    ['scandale', KeywordType.SENSITIVE_TOPIC, Priority.CRITICAL],
    ['gouvernance', KeywordType.SENSITIVE_TOPIC, Priority.HIGH],
    ['transparence', KeywordType.SENSITIVE_TOPIC, Priority.HIGH],
    ['marche public', KeywordType.SENSITIVE_TOPIC, Priority.HIGH],
    ['contrat public', KeywordType.SENSITIVE_TOPIC, Priority.HIGH],
    ['campagne', KeywordType.OTHER, Priority.MEDIUM],
  ];

  for (const [keyword, keywordType, priority] of personKeywords) {
    const existing = await prisma.keyword.findFirst({
      where: {
        organizationId: organization.id,
        keyword,
      },
    });

    if (existing) {
      await prisma.keyword.update({
        where: { id: existing.id },
        data: {
          keywordType,
          priority,
          active: true,
          platforms: basePlatforms,
          monitoredProfileId: personProfile.id,
        },
      });
    } else {
      await prisma.keyword.create({
        data: {
          organizationId: organization.id,
          monitoredProfileId: personProfile.id,
          keyword,
          keywordType,
          priority,
          platforms: basePlatforms,
          active: true,
        },
      });
    }
  }

  for (const company of companies) {
    const companyProfileId = `${organization.id}-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const existing = await prisma.keyword.findFirst({
      where: {
        organizationId: organization.id,
        keyword: company,
      },
    });

    if (existing) {
      await prisma.keyword.update({
        where: { id: existing.id },
        data: {
          keywordType: KeywordType.COMPANY,
          priority: Priority.HIGH,
          active: true,
          platforms: basePlatforms,
          monitoredProfileId: companyProfileId,
        },
      });
    } else {
      await prisma.keyword.create({
        data: {
          organizationId: organization.id,
          monitoredProfileId: companyProfileId,
          keyword: company,
          keywordType: KeywordType.COMPANY,
          priority: Priority.HIGH,
          platforms: basePlatforms,
          active: true,
        },
      });
    }
  }

  await prisma.notificationChannel.upsert({
    where: {
      id: `${organization.id}-email-channel`,
    },
    update: {
      organizationId: organization.id,
      type: NotificationChannelType.EMAIL,
      label: 'Email principal Fritz',
      destination: alertEmail,
      active: true,
    },
    create: {
      id: `${organization.id}-email-channel`,
      organizationId: organization.id,
      type: NotificationChannelType.EMAIL,
      label: 'Email principal Fritz',
      destination: alertEmail,
      active: true,
    },
  });

  await prisma.notificationChannel.upsert({
    where: {
      id: `${organization.id}-whatsapp-channel`,
    },
    update: {
      organizationId: organization.id,
      type: NotificationChannelType.WHATSAPP,
      label: 'WhatsApp cellule communication',
      destination: alertWhatsapp,
      active: true,
    },
    create: {
      id: `${organization.id}-whatsapp-channel`,
      organizationId: organization.id,
      type: NotificationChannelType.WHATSAPP,
      label: 'WhatsApp cellule communication',
      destination: alertWhatsapp,
      active: true,
    },
  });

  const rssSources = [
    {
      name: 'Le Nouvelliste',
      feedUrl: 'https://example.com/rss/le-nouvelliste.xml',
      websiteUrl: 'https://lenouvelliste.com',
      active: false,
      checkIntervalMinutes: 15,
    },
    {
      name: 'Haiti Libre',
      feedUrl: 'https://example.com/rss/haiti-libre.xml',
      websiteUrl: 'https://www.haitilibre.com',
      active: false,
      checkIntervalMinutes: 15,
    },
  ];

  for (const source of rssSources) {
    const existing = await prisma.rssSource.findFirst({
      where: { organizationId: organization.id, name: source.name },
    });
    if (!existing) {
      await prisma.rssSource.create({
        data: { organizationId: organization.id, ...source },
      });
    }
  }

  const gdelt = await prisma.searchProviderConnection.findFirst({
    where: { organizationId: organization.id, provider: SearchProvider.GDELT },
  });

  if (!gdelt) {
    await prisma.searchProviderConnection.create({
      data: {
        organizationId: organization.id,
        provider: SearchProvider.GDELT,
        label: 'GDELT Gratuit',
        active: true,
        baseUrl: 'https://api.gdeltproject.org/api/v2/doc/doc',
        config: { maxRecords: 10 },
      },
    });
  }

  const webQueries = [
    `"${fullName}"`,
    `"Fritz Michel"`,
    `"${fullName}" corruption scandale gouvernance`,
    `"${nickname}"`,
    ...companies.map((company) => `"${company}"`),
  ];

  for (const query of webQueries) {
    const existing = await prisma.webNewsQuery.findFirst({
      where: { organizationId: organization.id, query },
    });
    if (!existing) {
      await prisma.webNewsQuery.create({
        data: {
          organizationId: organization.id,
          name: query.replaceAll('"', ''),
          query,
          language: 'fr',
          country: 'HA',
          active: true,
          checkIntervalMinutes: 5,
        },
      });
    }
  }

  const crawlSources = [
    {
      name: 'Medias locaux',
      baseUrl: 'https://lenouvelliste.com',
      startUrls: ['https://lenouvelliste.com', 'https://satellite509.com'],
      allowedDomains: ['lenouvelliste.com', 'satellite509.com'],
      active: true,
      respectRobotsTxt: true,
      checkIntervalMinutes: 30,
      maxPagesPerRun: 5,
    },
    {
      name: 'Sites institutionnels',
      baseUrl: 'https://www.haitilibre.com',
      startUrls: ['https://www.haitilibre.com'],
      allowedDomains: ['www.haitilibre.com', 'haitilibre.com'],
      active: true,
      respectRobotsTxt: true,
      checkIntervalMinutes: 30,
      maxPagesPerRun: 5,
    },
    {
      name: 'Blogs politiques',
      baseUrl: 'https://www.alterpresse.org',
      startUrls: ['https://www.alterpresse.org'],
      allowedDomains: ['www.alterpresse.org', 'alterpresse.org'],
      active: true,
      respectRobotsTxt: true,
      checkIntervalMinutes: 30,
      maxPagesPerRun: 5,
    },
    {
      name: 'AyiboPost',
      baseUrl: 'https://ayibopost.com',
      startUrls: ['https://ayibopost.com'],
      allowedDomains: ['ayibopost.com'],
      active: true,
      respectRobotsTxt: true,
      checkIntervalMinutes: 30,
      maxPagesPerRun: 5,
    },
  ];

  for (const source of crawlSources) {
    const existing = await prisma.crawlSource.findFirst({
      where: { organizationId: organization.id, name: source.name },
    });
    if (!existing) {
      await prisma.crawlSource.create({
        data: {
          organizationId: organization.id,
          ...source,
        },
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        adminEmail,
        organization: organization.name,
        nickname,
        companies,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
