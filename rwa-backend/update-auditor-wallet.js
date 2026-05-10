import prisma from './src/prisma.js';

async function update() {
  try {
    const user = await prisma.user.update({
      where: { id: 5 }, // Head Auditor ID
      data: {
        walletAddress: "0x9e96472400e33FB547b49dC5f7118a9ae1BA4B76"
      }
    });
    console.log("UPDATE_SUCCESS:", JSON.stringify(user, null, 2));
  } catch (err) {
    console.error("UPDATE_ERROR:", err.message);
  }
  process.exit(0);
}

update();
