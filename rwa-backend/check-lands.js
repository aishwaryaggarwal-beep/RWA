import prisma from './src/prisma.js';

async function main() {
  console.log("🔍 Fetching recent property statuses...");
  
  try {
    const lands = await prisma.land.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        owner: {
          select: { name: true, email: true }
        }
      }
    });

    console.log("\n--- Property Status Report ---");
    lands.forEach((land, i) => {
      console.log(`${i+1}. [${land.status}] ${land.title} (ID: ${land.landId})`);
      console.log(`   Owner: ${land.owner?.name} (${land.owner?.email})`);
      console.log(`   On-Chain ID: ${land.onChainId || 'N/A'}`);
      console.log(`   Votes: ${land.verificationCount || 0}/3`);
      console.log('----------------------------');
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
