import prisma from './src/prisma.js';

async function check() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, name: true, walletAddress: true }
    });
    console.log("ADMIN_USERS:", JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("CHECK_ERROR:", err.message);
  }
  process.exit(0);
}

check();
