import prisma from "./src/prisma.js";

async function main() {
    const lands = await prisma.land.findMany({
        select: { id: true, title: true, isVerified: true, status: true }
    });
    console.log("Full Land Inventory:", JSON.stringify(lands, null, 2));
}

main().finally(() => prisma.$disconnect());
