import prisma from "./src/prisma.js";

async function main() {
    const l = await prisma.land.findMany({
        select: { id: true, title: true, status: true, isVerified: true, onChainId: true }
    });
    console.log(JSON.stringify(l, null, 2));
}

main().finally(() => prisma.$disconnect());
