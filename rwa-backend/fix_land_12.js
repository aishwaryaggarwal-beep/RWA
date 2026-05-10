import prisma from './src/prisma.js';

async function main() {
    await prisma.land.update({
        where: { id: 12 },
        data: { status: 'VERIFIED', isVerified: true }
    });
    console.log("Land 12 successfully synced to VERIFIED status in the database!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
