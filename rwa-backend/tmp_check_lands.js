import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const lands = await prisma.land.findMany({
        select: { id: true, title: true, status: true, onChainId: true, isVerified: true }
    });
    console.log(JSON.stringify(lands, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
