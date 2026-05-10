import prisma from "./src/prisma.js";

async function main() {
    const counts = await prisma.land.groupBy({
        by: ['status', 'isVerified'],
        _count: { id: true }
    });
    console.log("Land Counts by Status:", JSON.stringify(counts, null, 2));

    const lands = await prisma.land.findMany({
        select: { id: true, title: true, isVerified: true, status: true }
    });
    lands.forEach(l => {
        console.log(`[${l.id}] ${l.title} -> status: ${l.status}, verified: ${l.isVerified}`);
    });
}

main().finally(() => prisma.$disconnect());
