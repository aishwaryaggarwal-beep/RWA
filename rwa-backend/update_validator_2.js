import prisma from './src/prisma.js';

async function main() {
    const targetWallet = '0x5b16f7638109a364a2a586E15a9b6F30aBbB15E4';
    
    // 1. Find if someone else owns this wallet
    const existingUser = await prisma.user.findFirst({
        where: { walletAddress: { equals: targetWallet, mode: 'insensitive' } }
    });

    if (existingUser && existingUser.email !== 'val2@rwa.com') {
        console.log(`Unlinking wallet from existing account: ${existingUser.email}`);
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { walletAddress: null }
        });
    }

    // 2. Attach it to the Validator 2 account
    try {
        const updatedUser = await prisma.user.update({
            where: { email: 'val2@rwa.com' },
            data: { walletAddress: targetWallet },
            select: { id: true, name: true, email: true, walletAddress: true }
        });
        console.log("\n✅ Validator 2 updated successfully in DB:");
        console.log(JSON.stringify(updatedUser, null, 2));
    } catch (e) {
        console.log("Could not find val2@rwa.com. Error:", e.message);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
