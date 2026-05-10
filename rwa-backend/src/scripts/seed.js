import "dotenv/config";
import prisma from "../prisma.js";
import bcrypt from "bcrypt";

async function main() {
  console.log("🌱 Starting seeding process...");

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Sellers
  console.log("👤 Creating dummy sellers...");
  
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.com" },
    update: {},
    create: {
      name: "Alice Real Estate",
      email: "alice@example.com",
      password: passwordHash,
      role: "SELLER",
      walletAddress: "0x7b65e90...alice_placeholder", // Just a placeholder
    }
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@lands.com" },
    update: {},
    create: {
      name: "Bob Properties",
      email: "bob@lands.com",
      password: passwordHash,
      role: "SELLER",
      walletAddress: "0x2c1...bob_placeholder",
    }
  });

  // 2. Create KYC for Sellers (Mark as pending so user can see them in admin portal too)
  console.log("📝 Creating KYC records...");
  await prisma.kYC.upsert({
    where: { userId: alice.id },
    update: {},
    create: {
      userId: alice.id,
      status: "APPROVED", // Auto-approved for seed ease
      firstName: "Alice",
      lastName: "Smith",
      dob: new Date("1990-01-01"),
      address: "123 Metaverse Lane",
      city: "Asset City",
      pincode: "123456",
      documentCid: "QmXoy...place",
      selfieCid: "QmYoz...place",
      documentIv: "iv1",
      selfieIv: "iv2",
      documentType: "ID_CARD",
      selfieType: "LIVE"
    }
  });

  // 3. Create Land Portions
  console.log("🏞️ Creating land assets...");

  const lands = [
    {
      title: "Emerald Valley Estates",
      description: "Lush fertile agricultural valley with high-yield potential and natural irrigation. Perfect for organic farming and retirement living.",
      location: JSON.stringify({ address: "Green Hill Valley, Maharashtra, India 410101" }),
      area: 5000,
      price: 2500000,
      totalTokens: 1000,
      availableTokens: 1000,
      status: "PENDING",
      propertyType: "Agricultural",
      annualRevenue: 120000,
      maintenanceCosts: 15000,
      deedCid: "QmPZ9TcjX7e...place",
      taxReportCid: "QmY5f...place",
      ownerId: alice.id
    },
    {
      title: "Neon Horizon Commercial",
      description: "Prime commercial plot located in a high-traffic industrial zone. Excellent ROI for logistics hub or tech warehouse.",
      location: JSON.stringify({ address: "Industrial Hub Road, Bangalore, India 560001" }),
      area: 2400,
      price: 6800000,
      totalTokens: 2000,
      availableTokens: 2000,
      status: "PENDING",
      propertyType: "Commercial",
      annualRevenue: 450000,
      maintenanceCosts: 40000,
      deedCid: "QmRz...place",
      taxReportCid: "QmVm...place",
      ownerId: bob.id
    },
    {
        title: "Sunset Ridge Vineyard",
        description: "Breathtaking hillside property overlooking the western coast. Existing vineyards with luxury resort building potential.",
        location: JSON.stringify({ address: "Coast Road, Goa, India 403001" }),
        area: 12000,
        price: 9500000,
        totalTokens: 5000,
        availableTokens: 5000,
        status: "PENDING",
        propertyType: "Residential",
        annualRevenue: 850000,
        maintenanceCosts: 120000,
        deedCid: "Qm...place",
        taxReportCid: "Qm...place",
        ownerId: alice.id
      }
  ];

  for (const land of lands) {
    await prisma.land.create({ data: land });
  }

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
