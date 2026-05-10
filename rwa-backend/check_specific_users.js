import 'dotenv/config';
import prisma from './src/prisma.js';

async function main() {
  const users = await prisma.user.findMany({
    where: {
      email: {
        in: ['admin@gmail.com', 'aishwarya@gmail.com']
      }
    },
    select: {
      name: true,
      email: true,
      walletAddress: true
    }
  });
  users.forEach(u => console.log(`${u.email}: ${u.walletAddress}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
