import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🛠️ Starting Unique Global Wallet Sync...");

  // Find all users who are currently "Unregistered"
  const unregistered = await prisma.user.findMany({
    where: { walletAddress: null }
  });

  for (const user of unregistered) {
    // Generate a unique test address for this user based on their ID
    const uniqueWallet = `0x${user.id.toString(16).padStart(40, '0')}`;
    await prisma.user.update({
      where: { id: user.id },
      data: { walletAddress: uniqueWallet }
    });
  }

  console.log(`✅ Success! Synchronized ${unregistered.length} Unique User Wallets.`);
  console.log("--- Dashboard Data is now clean ---");
}

main()
  .catch((e) => {
    console.error("❌ Sync FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
