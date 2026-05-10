import prisma from "./src/prisma.js";

async function main() {
    const lands = await prisma.land.findMany({
        where: { isVerified: true },
        select: { id: true, title: true, isVerified: true, status: true, ownerId: true }
    });
    console.log("All Verified Lands:", JSON.stringify(lands, null, 2));

    const listing = await prisma.land.findMany({
        where: { status: "LISTED" },
        select: { id: true, title: true, isVerified: true, status: true }
    });
    console.log("Listed Lands:", JSON.stringify(listing, null, 2));
}

main().finally(() => prisma.$disconnect());
