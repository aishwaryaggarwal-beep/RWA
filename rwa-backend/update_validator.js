import prisma from './src/prisma.js';

async function main() {
    const targetWallet = '0x74b7E1535F7C8B67a3Bf4ECe6687592773848342';
    
    // 1. Find if someone else owns this wallet
    const existingUser = await prisma.user.findFirst({
        where: { walletAddress: { equals: targetWallet, mode: 'insensitive' } }
    });

    if (existingUser && existingUser.email !== 'val1@rwa.com') {
        console.log(`Unlinking wallet from existing account: ${existingUser.email}`);
        await prisma.user.update({
            where: { id: existingUser.id },
            data: { walletAddress: null }
        });
    }

    // 2. Attach it to the Validator account
    const updatedUser = await prisma.user.update({
        where: { email: 'val1@rwa.com' },
        data: { walletAddress: targetWallet },
        select: { id: true, name: true, email: true, walletAddress: true }
    });
    
    console.log("\n✅ Validator Alpha updated successfully:");
    console.log(JSON.stringify(updatedUser, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
