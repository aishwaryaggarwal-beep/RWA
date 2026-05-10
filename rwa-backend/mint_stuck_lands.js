// Direct mint script for stuck verified lands
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import prisma from "./src/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(fs.readFileSync(path.join(__dirname, "src/utils/abi.json"), "utf8"));

const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
const wallet = new ethers.Wallet(process.env.VALIDATOR_PRIVATE_KEY, provider);
const landToken = new ethers.Contract(process.env.LAND_TOKEN_ADDRESS, abi.LandToken, wallet);

async function main() {
    // Find all verified lands without onChainId
    const stuckLands = await prisma.land.findMany({
        where: { isVerified: true, onChainId: null },
        include: { owner: true }
    });

    console.log(`Found ${stuckLands.length} verified lands without on-chain tokens.`);

    for (const land of stuckLands) {
        const ownerWallet = land.owner.walletAddress;
        if (!ownerWallet) {
            console.log(`[SKIP] Land #${land.id} "${land.title}" — owner has no wallet`);
            continue;
        }

        const totalSupply = land.totalTokens || 1000;
        const metadataURI = land.deedCid || "ipfs://metadata-placeholder";

        console.log(`\n[MINTING] Land #${land.id} "${land.title}"`);
        console.log(`  → To: ${ownerWallet}`);
        console.log(`  → Supply: ${totalSupply}`);

        try {
            const tx = await landToken.mintLand(ownerWallet, totalSupply, metadataURI);
            console.log(`  → TX sent: ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`  → TX confirmed in block ${receipt.blockNumber}`);

            const onChainId = Number(await landToken.currentTokenId());
            await prisma.land.update({
                where: { id: land.id },
                data: { onChainId }
            });
            console.log(`  ✅ Minted as Token #${onChainId}`);
        } catch (e) {
            console.error(`  ❌ FAILED: ${e.message}`);
        }
    }
}

main()
    .catch(e => console.error("Fatal:", e))
    .finally(() => prisma.$disconnect());
