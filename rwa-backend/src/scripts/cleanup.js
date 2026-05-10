import "dotenv/config";
import prisma from "../prisma.js";

async function main() {
  console.log("🚀 Starting database cleanup...");

  try {
    // 1. Delete dependent records
    console.log("🗑️ Deleting LandVotes...");
    await prisma.landVote.deleteMany({});

    console.log("🗑️ Deleting Investments...");
    await prisma.investment.deleteMany({});

    console.log("🗑️ Deleting Lands...");
    await prisma.land.deleteMany({});

    console.log("🗑️ Deleting KYCs...");
    await prisma.kYC.deleteMany({});

    // 2. Delete non-essential Users
    console.log("🗑️ Deleting non-admin/validator accounts...");
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        role: {
          notIn: ["ADMIN", "VALIDATOR"]
        }
      }
    });

    console.log(`✅ Successfully deleted ${deletedUsers.count} users.`);
    console.log("✨ Database is now fresh!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
