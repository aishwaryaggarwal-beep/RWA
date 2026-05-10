import prisma from "./src/prisma.js";

async function main() {
    const lands = await prisma.land.findMany({
        select: { id: true, title: true, isVerified: true, status: true }
    });
    console.log("=== LAND LIST ===");
    lands.forEach(l => {
        console.log(`ID: ${l.id} | Title: ${l.title} | Status: ${l.status} | Verified: ${l.isVerified}`);
    });
    console.log("================");
}

main().finally(() => prisma.$disconnect());
