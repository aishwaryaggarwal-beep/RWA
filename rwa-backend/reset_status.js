import prisma from "./src/prisma.js";

async function main() {
    const updated = await prisma.land.updateMany({
        where: { status: 'LISTED' },
        data: { status: 'VERIFIED' }
    });
    console.log(`Reset ${updated.count} lands to VERIFIED status.`);
}

main().finally(() => prisma.$disconnect());
