import prisma from './src/prisma.js';

async function main() {
  const kycs = await prisma.kYC.findMany({
    include: { user: true }
  });
  console.log(JSON.stringify(kycs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
