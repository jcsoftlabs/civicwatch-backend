import { Platform, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const organizationId = 'cmqzsuhwm0001a3zt8y6v8lbr';
const identityTerms = ['Fritz William Michel', 'Fritz Michel', 'Neg Kabrit La'];

async function main() {
  const mentions = await prisma.mention.findMany({
    where: {
      organizationId,
      platform: Platform.CRAWLER,
    },
    select: {
      id: true,
      sourceName: true,
      title: true,
      matchedKeywords: true,
    },
  });

  const noisy = mentions.filter((mention) => {
    const matched = Array.isArray(mention.matchedKeywords)
      ? mention.matchedKeywords.map((item) => String(item))
      : [];

    return !matched.some((keyword) => identityTerms.includes(keyword));
  });

  console.log(
    JSON.stringify(
      {
        totalCrawlerMentions: mentions.length,
        noisyCount: noisy.length,
        noisySample: noisy.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (noisy.length > 0) {
    const result = await prisma.mention.deleteMany({
      where: {
        id: { in: noisy.map((mention) => mention.id) },
      },
    });

    console.log(JSON.stringify({ deletedCount: result.count }, null, 2));
  }

  const remainingAlerts = await prisma.alert.findMany({
    where: { organizationId },
    include: {
      mention: {
        select: {
          sourceName: true,
          title: true,
          matchedKeywords: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log(
    JSON.stringify(
      {
        remainingAlertsCount: remainingAlerts.length,
        remainingAlerts,
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
