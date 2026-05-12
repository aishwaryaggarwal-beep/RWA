import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'admin@rwa.com';
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    console.log(`👤 User: ${user.email}, Role: ${user.role}`);
    if (user.role !== 'ADMIN') {
      console.log('⚠️ Fixing Role to ADMIN...');
      await prisma.user.update({
        where: { email },
        data: { role: 'ADMIN' }
      });
      console.log('✅ Role updated successfully.');
    } else {
      console.log('✅ Role is already ADMIN.');
    }
  } else {
    console.log('❌ Admin user not found.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
