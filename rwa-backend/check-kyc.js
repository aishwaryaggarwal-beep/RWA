import prisma from './src/prisma.js';

async function check() {
  try {
    const lastKyc = await prisma.kYC.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    });
    console.log("LAST_KYC_RESULT:", JSON.stringify(lastKyc, null, 2));
  } catch (err) {
    console.error("CHECK_KYC_ERROR:", err.message);
  }
  process.exit(0);
}

check();
