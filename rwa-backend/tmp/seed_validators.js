import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🛠️ Starting Validator Seeding (with Hashing)...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const val1 = await prisma.user.upsert({
    where: { email: "val1@rwa.com" },
    update: { 
      password: hashedPassword,
      role: "VALIDATOR" 
    },
    create: {
      email: "val1@rwa.com",
      password: hashedPassword,
      name: "Validator Alpha",
      role: "VALIDATOR",
      walletAddress: "0x7E099eD03A321BF42BF709DD2bd76d1AA00D267",
    },
  });

  const val2 = await prisma.user.upsert({
    where: { email: "val2@rwa.com" },
    update: { 
      password: hashedPassword,
      role: "VALIDATOR" 
    },
    create: {
      email: "val2@rwa.com",
      password: hashedPassword,
      name: "Validator Beta",
      role: "VALIDATOR",
      walletAddress: "0x398B156ECC7C5E15493003E90D4376D1AA00D267",
    },
  });


  console.log("✅ Seed Successful!");
  console.log("Validator 1: val1@rwa.com | password123");
  console.log("Validator 2: val2@rwa.com | password123");
}

main()
  .catch((e) => {
    console.error("❌ Seeding FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
