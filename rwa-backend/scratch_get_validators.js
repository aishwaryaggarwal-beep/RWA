import prisma from './src/prisma.js';

async function main() {
    const validators = await prisma.user.findMany({
        where: { role: 'VALIDATOR' },
        select: { id: true, name: true, email: true, walletAddress: true }
    });
    console.log(JSON.stringify(validators, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
