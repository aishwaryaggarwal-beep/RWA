import prisma from "./src/prisma.js";

async function main() {
    await prisma.land.updateMany({
        where: { status: 'VERIFIED' },
        data: { status: 'LISTED' }
    });
    console.log("Updated to LISTED");
}

main().finally(() => prisma.$disconnect());
