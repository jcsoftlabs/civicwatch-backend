import { Platform, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const organizationId = 'cmqzsuhwm0001a3zt8y6v8lbr';

async function main() {
  const mentions = await prisma.mention.findMany({
    where: {
      organizationId,
      platform: Platform.CRAWLER,
      sourceName: 'Satellite509',
      title: { startsWith: 'Vous avez cherché' },
    },
    select: { id: true, title: true, matchedKeywords: true },
  });

  console.log(JSON.stringify({ count: mentions.length, mentions }, null, 2));

  if (mentions.length > 0) {
    const deleted = await prisma.mention.deleteMany({
      where: { id: { in: mentions.map((mention) => mention.id) } },
    });
    console.log(JSON.stringify({ deletedCount: deleted.count }, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
