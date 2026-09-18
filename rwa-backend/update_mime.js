import prisma from './src/prisma.js';

async function main() {
  await prisma.kYC.update({
    where: { userId: 12 },
    data: { documentMimeType: 'application/pdf' }
  });
  console.log("Updated MIME type for user 12 to application/pdf");
}

main().catch(console.error).finally(() => prisma.$disconnect());
