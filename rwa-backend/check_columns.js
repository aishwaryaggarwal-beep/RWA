import prisma from './src/prisma.js';

async function main() {
  const kyc = await prisma.kYC.findFirst();
  if (kyc) {
    console.log(Object.keys(kyc));
  } else {
    console.log("No KYC found");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
