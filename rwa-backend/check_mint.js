import prisma from './src/prisma.js';
import { ethers } from 'ethers';
import fs from 'fs';

async function main() {
    const land = await prisma.land.findUnique({
        where: { id: 12 },
        include: { owner: true }
    });
    console.log("Land 12:", land);

    if (land && !land.onChainId) {
        console.log("Tokens not minted! Minting now...");
        const abi = JSON.parse(fs.readFileSync('./src/utils/abi.json', 'utf8'));
        const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
        const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
        const landToken = new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, abi.LandToken, wallet);

        try {
            const tx = await landToken.mintLand(land.owner.walletAddress, land.totalTokens, land.deedCid || "ipfs://placeholder");
            console.log("Mint Tx:", tx.hash);
            await tx.wait();
            
            const onChainId = Number(await landToken.currentTokenId());
            await prisma.land.update({
                where: { id: 12 },
                data: { onChainId }
            });
            console.log("Successfully minted token ID:", onChainId);
        } catch (e) {
            console.error("Mint failed:", e);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
