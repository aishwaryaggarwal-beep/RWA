import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔍 Database Deep Scan: KYC Records');
  const kycList = await prisma.kYC.findMany({
    include: { user: { select: { email: true, name: true } } }
  });

  if (kycList.length === 0) {
    console.log('❌ No KYC records found in database.');
  } else {
    kycList.forEach((k, i) => {
      console.log(`[${i+1}] Name: ${k.firstName} ${k.lastName}, Email: ${k.user?.email}, Status: ${k.status}, Risk: ${k.riskScore}`);
    });
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
