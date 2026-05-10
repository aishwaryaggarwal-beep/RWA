import "dotenv/config";
import prisma from "../prisma.js";
import bcrypt from "bcrypt";

async function seedAdmin() {
  console.log("🚀 Starting Identity Auditor Seeding...");

  try {
    const adminEmail = "admin@rwa.com";
    const adminPass = "admin123";

    // 1. Check if exists
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existing) {
      console.log(`⚠️  Admin with email ${adminEmail} already exists! Skipping...`);
      return;
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(adminPass, 10);

    // 3. Create admin
    const admin = await prisma.user.create({
      data: {
        name: "Head Auditor",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN"
      }
    });

    console.log("✅ Identity Auditor seeded successfully!");
    console.log("---------------------------------------");
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPass}`);
    console.log(`Role:     ADMIN`);
    console.log("---------------------------------------");
    console.log("Please log in with these credentials to access the Auditor Portal.");

  } catch (err) {
    console.error("❌ Failed to seed auditor:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
