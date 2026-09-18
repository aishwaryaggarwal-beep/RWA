import prisma from './src/prisma.js';

async function main() {
  const kyc = await prisma.kYC.findFirst({
    where: { firstName: { contains: 'aish', mode: 'insensitive' } }
  });
  console.log(JSON.stringify(kyc, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
