import prisma from "./src/prisma.js";

async function main() {
    try {
        const lands = await prisma.land.findMany({
            include: {
                owner: { select: { walletAddress: true } }
            }
        });
        console.log(JSON.stringify(lands, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
