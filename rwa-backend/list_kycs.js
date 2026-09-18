import prisma from './src/prisma.js';

async function main() {
  const ks = await prisma.kYC.findMany();
  console.log(ks.map(k => ({id: k.id, userId: k.userId, name: k.firstName, documentMimeType: k.documentMimeType})));
}

main().catch(console.error).finally(() => prisma.$disconnect());
