import prisma from "./src/prisma.js";

async function main() {
    const counts = await prisma.land.groupBy({
        by: ['status'],
        _count: { id: true }
    });
    console.log("Full status counts:", counts);
}

main().finally(() => prisma.$disconnect());
