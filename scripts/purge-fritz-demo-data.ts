import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const organizationId = 'cmqzsuhwm0001a3zt8y6v8lbr';
const demoSourceNames = [
  'Web Articles',
  'Instagram / Reels Watch',
  'Facebook Public Posts',
  'X / Twitter',
  'Online News Media',
  'RSS Feed Network',
];

async function main() {
  const demoMentions = await prisma.mention.findMany({
    where: {
      organizationId,
      sourceName: { in: demoSourceNames },
    },
    select: {
      id: true,
      sourceName: true,
      title: true,
      matchedKeywords: true,
    },
  });

  console.log(
    JSON.stringify(
      {
        demoMentionsCount: demoMentions.length,
        demoMentionsSample: demoMentions.slice(0, 10),
      },
      null,
      2,
    ),
  );

  if (demoMentions.length > 0) {
    const deletedMentions = await prisma.mention.deleteMany({
      where: {
        id: { in: demoMentions.map((mention) => mention.id) },
      },
    });

    console.log(JSON.stringify({ deletedMentionsCount: deletedMentions.count }, null, 2));
  }

  const reports = await prisma.report.findMany({
    where: { organizationId },
    select: { id: true, title: true },
  });

  console.log(
    JSON.stringify(
      {
        reportsCount: reports.length,
        reports,
      },
      null,
      2,
    ),
  );

  if (reports.length > 0) {
    const deletedReports = await prisma.report.deleteMany({
      where: {
        id: { in: reports.map((report) => report.id) },
      },
    });

    console.log(JSON.stringify({ deletedReportsCount: deletedReports.count }, null, 2));
  }

  const summary = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      _count: {
        select: {
          mentions: true,
          alerts: true,
          reports: true,
        },
      },
      mentions: {
        orderBy: { detectedAt: 'desc' },
        take: 10,
        select: {
          platform: true,
          sourceName: true,
          title: true,
          matchedKeywords: true,
          detectedAt: true,
        },
      },
      alerts: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          mention: {
            select: {
              sourceName: true,
              title: true,
              matchedKeywords: true,
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
